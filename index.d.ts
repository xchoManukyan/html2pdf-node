/// <reference types="node" />

export type PaperSize = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | string | [number, number];
export type CssLibrary = 'tailwind' | 'bootstrap5' | 'bootstrap4' | 'none';
export type Encryption = 'aes-256' | 'aes-128' | 'rc4-128';

export interface Signature {
  /** PEM file with the signing certificate (and its chain). With HttpClient: SERVER_CERTIFICATE. */
  certificate?: string;
  /** PEM file with the private key (RSA or ECDSA, unencrypted); default: the certificate file. */
  privateKey?: string;
  reason?: string;
  location?: string;
  contact?: string;
  /** Signer name shown by readers (default: the certificate's common name). Binary only. */
  name?: string;
}

export interface Options {
  /** A3, A4 (default), A5, Letter, Legal, "210x297" or [width, height] in millimetres. */
  paperSize?: PaperSize;
  orientation?: 'portrait' | 'landscape';
  /** Page margin on every side, 5-50 mm (default 15). CSS @page rules in the document win. */
  marginMm?: number;
  /** Print "Page X of Y" at the bottom of every page. */
  pageNumbers?: boolean;
  /** Lay the page out like a browser window this many CSS pixels wide (240-3840), scaled to the paper. */
  viewportWidth?: number | null;
  /** CSS libraries to apply; empty (default): detect them from the page. */
  cssLibraries?: CssLibrary[] | string;
  /** Download http(s) images, stylesheets and fonts (off by default). */
  remoteEnabled?: boolean;
  /** Folder the document may load local files from (nothing outside it can be read). */
  basePath?: string | null;
  /** Password needed to open the PDF. */
  userPassword?: string;
  /** Password for full access (random when only restrictions are set). */
  ownerPassword?: string;
  /** What readers may do without the owner password; restricting anything encrypts the PDF. */
  permissions?: { print?: boolean; copy?: boolean; modify?: boolean };
  /** Encryption of protected PDFs (default aes-256). */
  encryption?: Encryption;
  /** PDF/A-2b for archiving (needs installed or @font-face fonts; no encryption, no forms). */
  pdfA?: boolean;
  /** Inputs, checkboxes, radio buttons, selects and textareas become fillable PDF fields. */
  fillableForms?: boolean;
  /** Sign the PDF digitally (PAdES baseline, SHA-256). */
  signature?: Signature | null;
  /** Seconds a conversion may take (default 60). */
  timeout?: number;
}

export class Result {
  /** The PDF bytes. */
  readonly pdf: Buffer;
  /** CSS libraries applied, e.g. [{ lib: 'bootstrap5', source: 'classes' }]. */
  readonly cssLibraries: { lib: string; source: string }[];
  /** Resources that could not be loaded, with the reason. */
  readonly failures: { ref: string; reason: string }[];
  /** Time the converter took, in milliseconds. */
  readonly renderTimeMs: number;
  /** References of the resources that could not be loaded. */
  readonly missingResources: string[];
}

/** Converts HTML to PDF with the converter binary. */
export function convert(html: string | Buffer, options?: Options): Promise<Result>;
/** Converts an HTML file; its folder (or options.basePath) is where its local files load from. */
export function convertFile(file: string, options?: Options): Promise<Result>;

/** A client for a converter server (html2pdf-core started with -addr). */
export class HttpClient {
  constructor(baseUrl: string, config?: { headers?: Record<string, string> });
  convert(html: string | Buffer, options?: Options, file?: string): Promise<Result>;
  convertFile(file: string, options?: Options): Promise<Result>;
}

export class Html2PdfError extends Error {}
export class ConversionError extends Html2PdfError {}
export class TimeoutError extends Html2PdfError {}

/** Path of the converter binary for this machine (verified against the pinned checksum). */
export function findBinary(): string;
/** The converter version this package pins, e.g. "0.1.0". */
export function coreVersion(): string;
/** The version the converter binary in use reports. */
export function binaryVersion(): Promise<string>;
/** signature.certificate for HttpClient: the server signs with the certificate it was started with. */
export const SERVER_CERTIFICATE: '';

declare const html2pdf: {
  convert: typeof convert;
  convertFile: typeof convertFile;
  HttpClient: typeof HttpClient;
  Result: typeof Result;
  Html2PdfError: typeof Html2PdfError;
  ConversionError: typeof ConversionError;
  TimeoutError: typeof TimeoutError;
  findBinary: typeof findBinary;
  coreVersion: typeof coreVersion;
  binaryVersion: typeof binaryVersion;
  SERVER_CERTIFICATE: typeof SERVER_CERTIFICATE;
};
export default html2pdf;
