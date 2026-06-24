export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { withDb } = await import("@/lib/db");
    const { repairMismatchedImageExtension } = await import("@/lib/storage");

    withDb((data) => {
      for (const item of data.items) {
        item.imageUrl = repairMismatchedImageExtension(item.imageUrl);
      }
    });
  } catch (error) {
    console.error("Startup image-extension repair failed:", error);
  }
}
