import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 rounded-2xl border border-border/80 bg-card shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 font-mono text-2xl font-bold">
          404
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Innovation Page Not Found</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The innovation record, report, or route you are looking for does not exist or has been relocated.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/" className="w-full sm:w-auto">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 h-9">
              Analyze New Idea
            </Button>
          </Link>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full text-xs h-9">
              Open Private Vault
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
