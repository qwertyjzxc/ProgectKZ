"use client";

import { useRouter, useSearchParams } from "next/navigation";
import OwnerCategorySelector, { type OwnerCategory } from "@/components/dashboard/OwnerCategorySelector";
import OwnerCategoryContent from "@/components/dashboard/OwnerCategoryContent";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

const VALID_CATEGORIES = ["kvartiry", "pomescheniya", "doma", "zemlya"];

function OwnersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cat = searchParams.get("cat");
  const selectedCategory: OwnerCategory | null = VALID_CATEGORIES.includes(cat ?? "")
    ? (cat as OwnerCategory)
    : null;

  const handleSelect = (category: OwnerCategory) => {
    router.replace("/dashboard/owners?cat=" + category);
  };

  const handleBack = () => {
    router.replace("/dashboard/owners");
  };

  return selectedCategory === null ? (
    <OwnerCategorySelector onSelect={handleSelect} />
  ) : (
    <OwnerCategoryContent category={selectedCategory} onBack={handleBack} />
  );
}

export default function OwnersPage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <OwnersContent />
    </Suspense>
  );
}