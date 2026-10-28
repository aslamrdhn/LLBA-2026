-- 1. Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabel Users
CREATE TABLE users (
    sub VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture VARCHAR(255),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX unique_active_user_email ON users (email) WHERE deleted_at IS NULL;

-- 3. Tabel Tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    subscription_package VARCHAR(50) NOT NULL,
    subscription_status VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    accounting_lock_date DATE DEFAULT NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX unique_active_tenant_code ON tenants (code) WHERE deleted_at IS NULL;

-- 4. Tabel Outlets
CREATE TABLE outlets (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    id UUID DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    opening_time TIME DEFAULT '08:00',
    closing_time TIME DEFAULT '22:00',
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, id)
);
CREATE UNIQUE INDEX unique_active_outlet_slug ON outlets (slug) WHERE deleted_at IS NULL;

-- 5. RLS untuk Metadata
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
CREATE POLICY outlet_isolation ON outlets FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- 6. Tabel TenantUsers
CREATE TABLE tenant_users (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    outlet_id UUID NOT NULL REFERENCES outlets(tenant_id, id) ON DELETE RESTRICT,
    user_sub VARCHAR(255) REFERENCES users(sub) ON DELETE RESTRICT,
    role VARCHAR(50) NOT NULL,
    cashier_pin VARCHAR(255),
    device_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    PRIMARY KEY (tenant_id, outlet_id, user_sub)
);
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_user_isolation ON tenant_users FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- 7. Tabel Security Audit Log
CREATE TABLE security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    outlet_id UUID,
    device_id VARCHAR(255),
    actor_type VARCHAR(20),
    actor_id VARCHAR(255),
    event_type VARCHAR(50),
    event_detail JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabel Inventory Ledger
CREATE TABLE inventory_ledger (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    outlet_id UUID NOT NULL REFERENCES outlets(tenant_id, id) ON DELETE RESTRICT,
    id UUID DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL,
    qty_change NUMERIC(12, 4) NOT NULL,
    current_average_cost NUMERIC(12, 2) NOT NULL,
    mutation_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, outlet_id, id)
);
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY strict_data_isolation ON inventory_ledger FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND (
        current_setting('app.current_user_role') IN ('OWNER', 'MANAGER', 'FINANCE', 'WAREHOUSE')
        OR (
            current_setting('app.current_user_role') = 'CASHIER'
            AND outlet_id = current_setting('app.current_outlet_id')::uuid
        )
    )
);

-- 9. Tabel Sales Orders (Tanpa payment_method, tanpa payment_status)
CREATE TABLE sales_orders (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    outlet_id UUID NOT NULL REFERENCES outlets(tenant_id, id) ON DELETE RESTRICT,
    id UUID DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL,
    customer_id UUID,
    gross_total NUMERIC(15, 2) NOT NULL,
    rounding_amount NUMERIC(15, 2) DEFAULT 0,
    tax_amount NUMERIC(15, 2) DEFAULT 0,
    net_revenue NUMERIC(15, 2) NOT NULL,
    total_paid_amount NUMERIC(15, 2) GENERATED ALWAYS AS (gross_total + rounding_amount) STORED,
    order_status VARCHAR(20) DEFAULT 'DRAFT',
    cashier_id VARCHAR(255),
    order_source VARCHAR(20) DEFAULT 'POS',
    table_number VARCHAR(10),
    is_archived BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, outlet_id, id)
);
CREATE UNIQUE INDEX unique_active_order_number ON sales_orders (tenant_id, outlet_id, order_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_orders_active ON sales_orders(tenant_id, outlet_id, id) WHERE deleted_at IS NULL AND is_archived = FALSE;

-- 10. Tabel Sales Order Payments (Multi-Payment / Split Payment)
CREATE TABLE sales_order_payments (
    tenant_id UUID NOT NULL,
    outlet_id UUID NOT NULL,
    id UUID DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount_paid NUMERIC(15, 2) NOT NULL,
    reference_number VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id, outlet_id, order_id) 
        REFERENCES sales_orders(tenant_id, outlet_id, id) ON DELETE RESTRICT,
    PRIMARY KEY (tenant_id, outlet_id, id)
);

-- 11. Tabel Sales Order Details (dengan Self-Referencing Parent & processed_at)
CREATE TABLE sales_order_details (
    tenant_id UUID NOT NULL,
    outlet_id UUID NOT NULL,
    order_id UUID NOT NULL,
    id UUID DEFAULT uuid_generate_v4(),
    menu_id UUID NOT NULL,
    parent_detail_id UUID,
    qty INT NOT NULL,
    selling_price_per_item NUMERIC(12, 2) NOT NULL,
    cogs_snapshot_per_item NUMERIC(12, 2) NOT NULL,
    recipe_version_id UUID,
    needs_cogs_recalculation BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, outlet_id, id),
    FOREIGN KEY (tenant_id, outlet_id, order_id) 
        REFERENCES sales_orders(tenant_id, outlet_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, outlet_id, parent_detail_id) 
        REFERENCES sales_order_details(tenant_id, outlet_id, id) ON DELETE RESTRICT
);

-- 12. Tabel Stock Opname (dengan Valuation untuk Surplus)
CREATE TABLE stock_opnames (
    tenant_id UUID NOT NULL,
    outlet_id UUID NOT NULL,
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL,
    system_qty NUMERIC(12, 4) NOT NULL,
    physical_qty NUMERIC(12, 4) NOT NULL,
    variance_qty NUMERIC(12, 4) NOT NULL,
    variance_type VARCHAR(10) NOT NULL,
    estimated_unit_cost NUMERIC(12, 2),
    last_known_avg_cost NUMERIC(12, 2),
    approved_by VARCHAR(255),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id, outlet_id) REFERENCES outlets(tenant_id, id) ON DELETE RESTRICT
);

-- 13. Tabel Inventory Transfers (dengan Landed Cost)
CREATE TABLE inventory_transfers (
    tenant_id UUID NOT NULL,
    from_outlet_id UUID NOT NULL,
    to_outlet_id UUID NOT NULL,
    id UUID DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL,
    qty NUMERIC(12, 4) NOT NULL,
    avg_cost_sender NUMERIC(12, 2) NOT NULL,
    landed_cost NUMERIC(15, 2) DEFAULT 0,
    total_transfer_value NUMERIC(15, 2) GENERATED ALWAYS AS (qty * avg_cost_sender + landed_cost) STORED,
    status VARCHAR(20) DEFAULT 'PENDING',
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, id)
);

-- 14. Tabel Purchase Requests (Supplier RLS)
CREATE TABLE purchase_requests (
    tenant_id UUID NOT NULL,
    outlet_id UUID NOT NULL,
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INT NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'SENT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id, outlet_id) REFERENCES outlets(tenant_id, id) ON DELETE RESTRICT
);
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplier_read_requests ON purchase_requests FOR SELECT USING (
    supplier_id = current_setting('app.current_supplier_id')::uuid
    OR tenant_id = current_setting('app.current_tenant_id')::uuid
);

-- 15. Tabel Refunds
CREATE TABLE refunds (
    tenant_id UUID NOT NULL,
    outlet_id UUID NOT NULL,
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_order_id UUID NOT NULL,
    refund_amount NUMERIC(15, 2) NOT NULL,
    refund_reason TEXT NOT NULL,
    refunded_by VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    contra_journal_id UUID,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id, outlet_id) REFERENCES outlets(tenant_id, id) ON DELETE RESTRICT
);

-- 16. Tabel Shifts (Blind Close)
CREATE TABLE shifts (
    tenant_id UUID NOT NULL,
    outlet_id UUID NOT NULL,
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    expected_cash NUMERIC(15, 2),
    actual_cash NUMERIC(15, 2),
    variance NUMERIC(15, 2),
    closed_by VARCHAR(255),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id, outlet_id) REFERENCES outlets(tenant_id, id) ON DELETE RESTRICT
);

-- 17. Tabel Shift Denominations
CREATE TABLE shift_cash_denominations (
    shift_id UUID REFERENCES shifts(id) ON DELETE RESTRICT,
    denomination NUMERIC(12, 2) NOT NULL,
    quantity INT NOT NULL,
    total NUMERIC(15, 2) GENERATED ALWAYS AS (denomination * quantity) STORED,
    PRIMARY KEY (shift_id, denomination)
);

-- 18. Tabel Google Drive Outbox
CREATE TABLE drive_sync_outbox (
    tenant_id UUID NOT NULL,
    outlet_id UUID NOT NULL,
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_content JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    error_message TEXT,
    drive_file_id VARCHAR(255),
    drive_file_link TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id, outlet_id) REFERENCES outlets(tenant_id, id) ON DELETE RESTRICT
);

-- 19. Tabel Failed Jobs (Persistence DLQ)
CREATE TABLE failed_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_name VARCHAR(100) NOT NULL,
    job_data JSONB NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    retry_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 20. Tabel Delayed Offline Sync Log (Offline Guardian)
CREATE TABLE delayed_offline_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    outlet_id UUID NOT NULL,
    payload JSONB NOT NULL,
    original_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING_REVIEW',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 21. Tabel QR Menus
CREATE TABLE qr_menus (
    tenant_id UUID NOT NULL,
    outlet_id UUID NOT NULL,
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number VARCHAR(10),
    slug VARCHAR(100) NOT NULL,
    qr_code TEXT,
    url VARCHAR(255) NOT NULL,
    printed_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id, outlet_id) REFERENCES outlets(tenant_id, id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX unique_active_qr_slug ON qr_menus (slug) WHERE deleted_at IS NULL;

-- 22. Tabel Archive (Cold Data)
CREATE TABLE sales_orders_archived (LIKE sales_orders INCLUDING ALL);
CREATE INDEX idx_sales_orders_archived_tenant ON sales_orders_archived(tenant_id, outlet_id);
