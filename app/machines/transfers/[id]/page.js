import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMachineTransferById, getAppSettings } from "@/lib/data";
import NavBar from "@/components/NavBar";
import TransferView from "./TransferView";

export default async function TransferDetailPage({ params }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const record = await getMachineTransferById(params.id);
  if (!record) notFound();
  const appSettings = await getAppSettings();
  const signaturesOn = appSettings.signaturesEnabled !== "false";

  const initial = {
    ...record,
    transferred_by_signature: signaturesOn ? record.transferred_by_signature : null,
    received_by_signature: signaturesOn ? record.received_by_signature : null,
  };

  return (
    <div>
      <NavBar session={session} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <TransferView initial={initial} timezone={appSettings.timezone} />
        </div>
      </main>
    </div>
  );
}
