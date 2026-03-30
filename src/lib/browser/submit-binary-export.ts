type SubmitBinaryExportOptions = {
  action: string;
  payload: string;
  frameName?: string;
};

export function submitBinaryExport({
  action,
  payload,
  frameName = "slipwise-export-frame",
}: SubmitBinaryExportOptions) {
  let frame = window.document.querySelector<HTMLIFrameElement>(
    `iframe[data-export-frame="${frameName}"]`,
  );

  if (!frame) {
    frame = window.document.createElement("iframe");
    frame.hidden = true;
    frame.name = frameName;
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("tabindex", "-1");
    frame.dataset.exportFrame = frameName;
    window.document.body.appendChild(frame);
  }

  const form = window.document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.target = frameName;
  form.enctype = "multipart/form-data";
  form.style.display = "none";

  const field = window.document.createElement("textarea");
  field.name = "payload";
  field.value = payload;
  form.appendChild(field);

  window.document.body.appendChild(form);
  form.submit();
  form.remove();
}
