import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { getServerI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export default async function NotFound() {
  const { messages } = await getServerI18n();

  return (
    <main className="app-shell flex flex-1 items-center justify-center py-20">
      <div className="max-w-xl rounded-xl border bg-card p-10 text-center shadow-sm">
        <p className="text-sm font-medium tracking-[0.18em] text-primary uppercase">
          {messages.notFound.eyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-semibold">{messages.notFound.title}</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {messages.notFound.description}
        </p>
        <Link
          href="/new"
          className={cn(buttonVariants(), "mt-8")}
        >
          {messages.notFound.action}
        </Link>
      </div>
    </main>
  );
}
