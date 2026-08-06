"use client";

import { useRouter, useSearchParams } from "next/navigation";
import ClientCategoryContent from "@/components/ClientCategoryContent";
import RentCategorySelector, { type RentCategory } from "@/components/RentCategorySelector";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

const VALID_CATEGORIES = ["houses", "premises", "apartments"];

function SellClientsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cat = searchParams.get("cat");
  const selectedCategory: RentCategory | null = VALID_CATEGORIES.includes(cat ?? "")
    ? (cat as RentCategory)
    : null;

  const handleSelect = (category: RentCategory) => {
    router.replace("/clients/sell?cat=" + category);
  };

  const handleBack = () => {
    router.replace("/clients/sell");
  };

  return selectedCategory === null ? (
    <RentCategorySelector onSelect={handleSelect} category="prodaja" />
  ) : (
    <ClientCategoryContent
      category="prodaja"
      propertyType={selectedCategory}
      onBack={handleBack}
    />
  );
}

export default function SellClientsPage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <SellClientsContent />
    </Suspense>
  );
}
