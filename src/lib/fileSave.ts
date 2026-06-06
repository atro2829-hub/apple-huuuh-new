// File Save Utility for Apple.NET
// Supports saving files to device on both Web and Android (Capacitor)

/**
 * Check if we're running inside Capacitor native app
 */
function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

/**
 * Save a PDF blob to the device
 * On Web: triggers browser download
 * On Android: saves to Downloads folder using Capacitor Filesystem
 */
export async function savePDFToDevice(
  pdfBlob: Blob,
  fileName: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    if (isCapacitorNative()) {
      return await savePDFToAndroid(pdfBlob, fileName);
    } else {
      return await savePDFToWeb(pdfBlob, fileName);
    }
  } catch (error: any) {
    console.error("[FileSave] Error saving PDF:", error);
    return { success: false, error: error.message || "فشل حفظ الملف" };
  }
}

/**
 * Save PDF using browser download (Web/PWA)
 */
async function savePDFToWeb(
  pdfBlob: Blob,
  fileName: string
): Promise<{ success: boolean; path?: string }> {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }, 100);

  return { success: true, path: fileName };
}

/**
 * Save PDF to Android Downloads folder using Capacitor Filesystem
 */
async function savePDFToAndroid(
  pdfBlob: Blob,
  fileName: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    // Convert blob to base64
    const base64Data = await blobToBase64(pdfBlob);

    // Try Capacitor Filesystem plugin
    const { Filesystem, Directory, Encoding } = await import(
      /* webpackIgnore: true */ "@capacitor/filesystem"
    );

    const result = await Filesystem.writeFile({
      path: `Download/${fileName}`,
      data: base64Data,
      directory: Directory.ExternalStorage,
      recursive: true,
    });

    console.log("[FileSave] PDF saved to:", result.uri);

    // Also share the file using the Share plugin if available
    try {
      const { Share } = await import(/* webpackIgnore: true */ "@capacitor/share");
      await Share.share({
        title: "Apple.NET Gift Cards",
        text: `بطاقات هدايا Apple.NET - ${fileName}`,
        url: result.uri,
        dialogTitle: "مشاركة بطاقات الهدايا",
      });
    } catch {
      // Share not available or cancelled - file is still saved
    }

    return { success: true, path: result.uri };
  } catch (error: any) {
    console.warn("[FileSave] Capacitor save failed, falling back to web:", error);
    // Fallback to web download
    return await savePDFToWeb(pdfBlob, fileName);
  }
}

/**
 * Convert a Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Data = base64.split(",")[1] || base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Save jsPDF document to device
 * Convenience function that converts jsPDF to blob and saves
 */
export async function savePDFDocToDevice(
  doc: any, // jsPDF instance
  fileName: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    // Get PDF as blob
    const pdfBlob = doc.output("blob");
    return await savePDFToDevice(pdfBlob, fileName);
  } catch (error: any) {
    // Fallback to standard jsPDF save
    try {
      doc.save(fileName);
      return { success: true, path: fileName };
    } catch (fallbackError: any) {
      return { success: false, error: fallbackError.message || "فشل حفظ الملف" };
    }
  }
}
