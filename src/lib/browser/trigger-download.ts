export function triggerBrowserDownload(url: string, frameName = "slipwise-download-frame") {
  let frame = window.document.querySelector<HTMLIFrameElement>(
    `iframe[data-download-frame="${frameName}"]`,
  );

  if (!frame) {
    frame = window.document.createElement("iframe");
    frame.hidden = true;
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("tabindex", "-1");
    frame.dataset.downloadFrame = frameName;
    window.document.body.appendChild(frame);
  }

  frame.src = url;
}
