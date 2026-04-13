"use client";

import { CldUploadWidget, type CloudinaryUploadWidgetResults } from "next-cloudinary";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, Trash, Upload } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { LoadingButton } from "@/components/LoadingButton";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value: string; // The Image URL
  onChange: (url: string) => void;
  onRemove: () => void;
}

type UploadedAsset = {
  secure_url: string;
  resource_type?: string;
};

const VIDEO_EXT_RE = /\.(mp4|mov|webm|m4v|avi|mkv)$/i;

function isVideoUrl(url: string) {
  return VIDEO_EXT_RE.test(url);
}

export const FileUpload = ({ value, onChange, onRemove }: FileUploadProps) => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const [pendingUrl, setPendingUrl] = useState<string>("");
  const [pendingResourceType, setPendingResourceType] = useState<"image" | "video">("image");
  const [isUploadingDrop, setIsUploadingDrop] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const dragDepthRef = useRef(0);

  const hasSavedImage = Boolean(value);
  const hasPendingImage = Boolean(pendingUrl);
  const isSavedVideo = isVideoUrl(value);
  const isPendingVideo = pendingResourceType === "video" || isVideoUrl(pendingUrl);

  const canUpload = Boolean(cloudName && uploadPreset);

  const ensureConfig = () => {
    if (!cloudName) {
      toast.error("Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
      return false;
    }
    if (!uploadPreset) {
      toast.error("Missing NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET");
      return false;
    }
    return true;
  };

  const uploadFileDirectly = async (file: File) => {
    if (!ensureConfig()) return;

    setIsUploadingDrop(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset!);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as Partial<UploadedAsset> & { error?: { message?: string } };
      if (!response.ok || !data.secure_url) {
        throw new Error(data.error?.message ?? "Cloudinary upload failed");
      }

      setPendingUrl(data.secure_url);
      setPendingResourceType(data.resource_type === "video" ? "video" : "image");
      toast.success("Processing complete. Confirm upload to continue.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast.error(message);
    } finally {
      setIsUploadingDrop(false);
    }
  };

  const onDragEnter: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const onDragLeave: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragActive(false);
    }
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    await uploadFileDirectly(file);
  };

  return (
    <div className="space-y-4 w-full flex flex-col items-center justify-center">
      {hasSavedImage ? (
        <div className="w-full flex flex-col items-center gap-3">
          <div className="relative w-[200px] h-[200px] rounded-md overflow-hidden">
            <div className="z-10 absolute top-2 right-2">
              <Button type="button" onClick={onRemove} variant="destructive" size="icon">
                <Trash className="h-4 w-4" />
              </Button>
            </div>
            {isSavedVideo ? (
              <video className="h-full w-full object-cover" controls src={value} />
            ) : (
              <Image fill className="object-cover" alt="Upload" src={value} />
            )}
          </div>
          <Button type="button" variant="outline" onClick={onRemove} className="gap-2">
            <Trash className="h-4 w-4" />
            Remove Uploaded Media
          </Button>
        </div>
      ) : hasPendingImage ? (
        <div className="w-full flex flex-col items-center gap-3">
          <div className="relative w-[200px] h-[200px] rounded-md overflow-hidden">
            {isPendingVideo ? (
              <video className="h-full w-full object-cover" controls src={pendingUrl} />
            ) : (
              <Image fill className="object-cover" alt="Pending Upload" src={pendingUrl} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <LoadingButton
              action={async () => {
                onChange(pendingUrl);
                setPendingUrl("");
              }}
              loadingText="Confirming..."
              showSuccessToast
              successMessage="Upload confirmed"
              variant="default"
            >
              Confirm Upload
            </LoadingButton>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingUrl("");
                toast("Upload cancelled");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <CldUploadWidget
          config={{
            cloud: {
              cloudName,
            },
          }}
          uploadPreset={uploadPreset}
          onSuccess={(result: CloudinaryUploadWidgetResults) => {
            const info = result.info;
            if (!info || typeof info !== "object" || !("secure_url" in info)) {
              toast.error("Upload failed: missing uploaded file URL");
              return;
            }

            const secureUrl = info.secure_url;
            if (typeof secureUrl !== "string" || secureUrl.length === 0) {
              toast.error("Upload failed: invalid file URL");
              return;
            }

            setPendingUrl(secureUrl);
            toast.success("Processing complete. Confirm upload to continue.");
          }}
          onError={(error) => {
            const message =
              typeof error === "object" &&
              error !== null &&
              "statusText" in error &&
              typeof error.statusText === "string"
                ? error.statusText
                : "Upload failed. Check Cloudinary preset/settings.";
            toast.error(message);
          }}
        >
          {({ open }) => {
            return (
              <div
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
                className={cn(
                  "w-full rounded-xl border-2 border-dashed p-6 transition-all duration-200",
                  "bg-muted/40",
                  isDragActive
                    ? "border-primary bg-primary/10 shadow-[0_0_0_4px_hsl(var(--primary)/0.18)]"
                    : "border-border hover:border-ring/50"
                )}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  {isUploadingDrop ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Uploading dropped file...</p>
                    </>
                  ) : (
                    <>
                      <Upload
                        className={cn(
                          "h-6 w-6",
                          isDragActive ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <p className="text-sm text-muted-foreground">
                        {isDragActive
                          ? "Drop file here to upload"
                          : "Drag and drop media here, or click to browse"}
                      </p>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-12"
                    disabled={isUploadingDrop || !canUpload}
                    onClick={() => {
                      if (!ensureConfig()) return;
                      open();
                    }}
                  >
                    <ImagePlus className="h-5 w-5 mr-2" />
                    Upload Image (Optional)
                  </Button>
                </div>
              </div>
            );
          }}
        </CldUploadWidget>
      )}
    </div>
  );
};
