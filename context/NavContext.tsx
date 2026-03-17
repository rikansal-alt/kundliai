"use client";

import { createContext, useContext, useState } from "react";

interface NavContextType {
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
}

const NavContext = createContext<NavContextType>({
  sheetOpen: false,
  setSheetOpen: () => {},
});

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <NavContext.Provider value={{ sheetOpen, setSheetOpen }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNavContext() {
  return useContext(NavContext);
}
