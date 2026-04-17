import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QuickMessageSidebar from "@/components/results/QuickMessageSidebar";
import logo from "@/assets/logo.webp";
import { DEMO_IDS } from "@/lib/demo-constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseScanImages(serializedImages: string): string[] {
  if (!serializedImages) {
    return [];
  }

  try {
    const parsed = JSON.parse(serializedImages) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
    }
  } catch {
    // Fallback for older persisted CSV values.
  }

  return serializedImages
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export default async function ScanResultsPage({
  params,
}: {
  params: { scanId: string };
}) {
  const scan = await prisma.scan.findUnique({
    where: { id: params.scanId },
  });

  if (!scan) {
    notFound();
  }

  const images = parseScanImages(scan.images);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <header className="w-full bg-zinc-900 border-b border-zinc-800">
        <div className="mx-auto flex w-full max-w-[1092px] items-center justify-between p-[10px]">
          <Image src={logo} alt="DentalScan" className="h-[44px] w-auto" priority />
          <span className="text-xs text-zinc-500">Results</span>
        </div>
      </header>

      <main className="p-4 md:p-6">
        <div className="mx-auto flex w-full max-w-[1092px] flex-col gap-4 md:gap-6 lg:flex-row">
          <section className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/95 p-4 md:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-white md:text-2xl">Scan Results</h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Scan ID: <span className="font-mono text-zinc-300">{scan.id}</span>
                </p>
              </div>
              <Link href="/" className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
                New Scan
              </Link>
            </div>

            <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <p className="text-sm">
                Status:{" "}
                <span className={`font-semibold ${scan.status === "completed" ? "text-green-400" : "text-amber-300"}`}>
                  {scan.status}
                </span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Captured {images.length} image{images.length === 1 ? "" : "s"}.
              </p>
            </div>

            {images.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
                No scan images were found for this record.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {images.map((image, index) => (
                  <figure key={`${scan.id}-${index}`} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                    <img
                      src={image}
                      alt={`Captured scan angle ${index + 1}`}
                      className="h-32 w-full object-cover md:h-44"
                    />
                    <figcaption className="px-2 py-1 text-[11px] text-zinc-400">Angle {index + 1}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>

          <div className="w-full lg:w-[360px] lg:shrink-0">
            <QuickMessageSidebar patientId={DEMO_IDS.patientId} />
          </div>
        </div>
      </main>
    </div>
  );
}
