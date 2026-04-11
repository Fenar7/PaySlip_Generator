import { COUNTRY_CONFIGS } from "@/lib/currency/country-config";

export interface CountryInvoiceFormat {
  showGstin: boolean;
  showHsnSac: boolean;
  showGstColumns: boolean;
  showVatNumber: boolean;
  showTrn: boolean;
  showStateTax: boolean;
  invoiceTitle: string;
  taxLabel: string;
  vatIdLabel: string;
}

export function getCountryInvoiceFormat(
  countryCode: string,
): CountryInvoiceFormat {
  const config = COUNTRY_CONFIGS[countryCode];
  if (!config) {
    return {
      showGstin: false,
      showHsnSac: false,
      showGstColumns: false,
      showVatNumber: false,
      showTrn: false,
      showStateTax: false,
      invoiceTitle: "Invoice",
      taxLabel: "Tax",
      vatIdLabel: "",
    };
  }
  return {
    showGstin: config.showGstin,
    showHsnSac: config.showHsnSac,
    showGstColumns: config.showCgstSgstIgst,
    showVatNumber: config.showVatNumber,
    showTrn: config.showTrn,
    showStateTax: config.showStateTax,
    invoiceTitle: config.invoiceTitle,
    taxLabel: config.taxLabel,
    vatIdLabel: config.vatIdLabel,
  };
}
