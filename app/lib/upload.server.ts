import { api } from "~/lib/api.server";

export async function handleUploadAction(request: Request) {
  const formData = await request.formData();

  const file = formData.get("file") as File | null;
  const docType = formData.get("doc_type") as string | null;
  const fund = formData.get("fund") as string | null;

  if (!file || !docType || !fund) {
    return { error: "Missing required fields" };
  }

  const backendForm = new FormData();
  backendForm.append("file", file, file.name);
  backendForm.append("doc_type", docType);
  backendForm.append("fund", fund);

  const document = await api.uploadDocument(backendForm);
  return { document };
}
