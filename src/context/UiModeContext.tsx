import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type UiMode = "simple" | "advanced";

interface UiModeContextType {
  uiMode: UiMode;
  toggleUIMode: (mode: UiMode) => void;
  translateTerm: (term: string) => string;
}

const UiModeContext = createContext<UiModeContextType | undefined>(undefined);

export const UiModeProvider = ({ children }: { children: ReactNode }) => {
  const [uiMode, setUiMode] = useState<UiMode>("simple");

  useEffect(() => {
    const savedMode = localStorage.getItem("ledgerline_ui_mode") as UiMode;
    if (savedMode) {
      setUiMode(savedMode);
    }
  }, []);

  const toggleUIMode = (mode: UiMode) => {
    setUiMode(mode);
    localStorage.setItem("ledgerline_ui_mode", mode);
  };

  const translateTerm = (term: string): string => {
    if (uiMode === "advanced") return term;

    const mapping: Record<string, string> = {
      "Weighted Average Cost": "Harga rata-rata tertimbang",
      "Chart of Accounts": "Kode akun",
      "Kitchen Order Ticket (KOT)": "Tiket dapur",
      "Bill of Materials (BOM)": "Resep",
      "Cost of Goods Sold (COGS)": "Harga Pokok Penjualan (HPP)",
      "Gross Margin": "Laba Kotor",
    };

    return mapping[term] || term;
  };

  return (
    <UiModeContext.Provider value={{ uiMode, toggleUIMode, translateTerm }}>
      {children}
    </UiModeContext.Provider>
  );
};

export const useUiMode = () => {
  const context = useContext(UiModeContext);
  if (context === undefined) {
    throw new Error("useUiMode must be used within a UiModeProvider");
  }
  return context;
};
