import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="app-shell flex flex-1 items-center justify-center py-20">
      <div className="max-w-xl rounded-xl border bg-card p-10 text-center shadow-sm">
        <p className="text-sm font-medium tracking-[0.18em] text-primary uppercase">
          Not found
        </p>
        <h1 className="mt-4 text-4xl font-semibold">That scheduling board does not exist.</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          The link may be incomplete, expired or already removed. You can always
          create a new board and start fresh.
        </p>
        <Link
          href="/new"
          className={cn(buttonVariants(), "mt-8")}
        >
          Create a new event
        </Link>
      </div>
    </main>
  );
}
