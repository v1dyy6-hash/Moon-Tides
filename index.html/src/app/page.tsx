import MoonTidesApp from "@/components/game/MoonTidesApp";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#02030f]">
      <MoonTidesApp />
    </main>
  );
}
