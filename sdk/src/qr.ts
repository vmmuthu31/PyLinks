import QRCode from "qrcode";

export function generateQRCodePayload(payload: any): Promise<string> {
  return QRCode.toDataURL(JSON.stringify(payload));
}
