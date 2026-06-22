"use client";

import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMCEEditor } from "tinymce";

const FULL_TOOLBAR =
  "undo redo | styles | bold italic underline strikethrough | " +
  "alignleft aligncenter alignright | bullist numlist outdent indent | " +
  "link image | forecolor backcolor removeformat | code fullscreen";

const MINIMAL_TOOLBAR = "bold italic underline | link | bullist numlist";

const FULL_PLUGINS = [
  "advlist", "autolink", "lists", "link", "image", "charmap",
  "searchreplace", "visualblocks", "code", "fullscreen", "wordcount",
];

export function RichTextEditor({
  value,
  onChange,
  height = 320,
  minimalMode = false,
  ariaLabel = "Rich text editor",
}: {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  minimalMode?: boolean;
  ariaLabel?: string;
}) {
  return (
    <Editor
      tinymceScriptSrc="/tinymce/tinymce.min.js"
      licenseKey="gpl"
      value={value}
      onEditorChange={onChange}
      init={{
        height,
        menubar: false,
        branding: false,
        promotion: false,
        statusbar: !minimalMode,
        resize: !minimalMode,
        plugins: minimalMode ? ["lists", "link"] : FULL_PLUGINS,
        toolbar: minimalMode ? MINIMAL_TOOLBAR : FULL_TOOLBAR,
        content_style:
          "body{font-family:inherit;font-size:16px;line-height:1.6;color:#1a1a1a;padding:12px}" +
          "p{margin:0 0 1em}a{color:#1f3a5f}",
        images_upload_handler: async (blobInfo) => {
          const fd = new FormData();
          fd.append("file", blobInfo.blob(), blobInfo.filename());
          const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          return data.url as string;
        },
        setup: (editor: TinyMCEEditor) => {
          // Label the editor's iframe for assistive tech.
          editor.on("init", () => {
            const iframe = editor.getContainer()?.querySelector("iframe");
            iframe?.setAttribute("title", ariaLabel);
          });
        },
      }}
    />
  );
}
