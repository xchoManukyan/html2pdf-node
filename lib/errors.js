'use strict';

/** Any failure: the converter is missing, cannot start, or answered unexpectedly. */
class Html2PdfError extends Error {
  constructor(message) {
    super(message);
    this.name = 'Html2PdfError';
  }
}

/** The document was rejected: empty, not HTML, too large, or it could not be converted. */
class ConversionError extends Html2PdfError {
  constructor(message) {
    super(message);
    this.name = 'ConversionError';
  }
}

/** The conversion took longer than the timeout. */
class TimeoutError extends Html2PdfError {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

module.exports = { Html2PdfError, ConversionError, TimeoutError };
