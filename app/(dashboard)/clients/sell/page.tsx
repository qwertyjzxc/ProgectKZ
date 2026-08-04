"use client";

import ClientCategoryContent from "@/components/ClientCategoryContent";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function SellClientsPage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <ClientCategoryContent category="prodaja" />
    </Suspense>
  );
}