export const getMenuItemImage = (p: {
  name?: string;
  category?: string;
  imageUrl?: string;
}): string => {
  if (p.imageUrl && (p.imageUrl.startsWith("http://") || p.imageUrl.startsWith("https://") || p.imageUrl.startsWith("data:"))) {
    // If it's not a generic placeholder, use it
    if (!p.imageUrl.includes("placehold.co") && !p.imageUrl.includes("via.placeholder")) {
      return p.imageUrl;
    }
  }

  const name = (p.name || "").toLowerCase();
  const category = (p.category || "").toLowerCase();

  // Coffee variants
  if (name.includes("cappuccino")) {
    return "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("espresso")) {
    return "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("caramel") || name.includes("macchiato")) {
    return "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("cold brew") || name.includes("coldbrew")) {
    return "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("americano") || name.includes("black coffee") || name.includes("long black")) {
    return "https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("latte") || name.includes("kopi susu") || name.includes("aren")) {
    return "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("v60") || name.includes("manual brew") || name.includes("filter")) {
    return "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80";
  }

  // Non-coffee & Teas
  if (name.includes("matcha")) {
    return "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("tea") || name.includes("teh") || name.includes("earl grey")) {
    return "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("chocolate") || name.includes("cokelat") || name.includes("cocoa")) {
    return "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("red velvet") || name.includes("taro")) {
    return "https://images.unsplash.com/photo-1615865417491-9941019fbc00?auto=format&fit=crop&w=600&q=80";
  }

  // Snacks & Pastries
  if (name.includes("croissant") || name.includes("pastry") || name.includes("danish")) {
    return "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("fries") || name.includes("kentang") || name.includes("truffle")) {
    return "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80";
  }

  // Heavy Meals
  if (name.includes("burger") || name.includes("sandwich") || name.includes("toast")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("rice") || name.includes("nasi") || name.includes("bowl")) {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80";
  }

  // Desserts
  if (name.includes("cake") || name.includes("tiramisu") || name.includes("cheesecake")) {
    return "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("waffle") || name.includes("pancake")) {
    return "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80";
  }

  // Coffee Beans
  if (category === "beans" || name.includes("bean") || name.includes("biji") || name.includes("roast")) {
    return "https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=600&q=80";
  }

  // Category based fallbacks
  if (category.includes("coffee")) {
    return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80";
  }
  if (category.includes("snack")) {
    return "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80";
  }
  if (category.includes("meal")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80";
  }
  if (category.includes("dessert")) {
    return "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80";
  }

  // Universal appetizing coffee fallback
  return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80";
};
