'use strict';

/** A finished conversion: the PDF and what happened on the way. */
class Result {
  /**
   * @param {Buffer} pdf
   * @param {{lib: string, source: string}[]} cssLibraries
   * @param {{ref: string, reason: string}[]} failures
   * @param {number} renderTimeMs
   */
  constructor(pdf, cssLibraries = [], failures = [], renderTimeMs = 0) {
    /** The PDF bytes. */
    this.pdf = pdf;
    /** CSS libraries applied, e.g. [{ lib: 'bootstrap5', source: 'classes' }]. */
    this.cssLibraries = cssLibraries;
    /** Resources that could not be loaded, with the reason. */
    this.failures = failures;
    /** Time the converter took, in milliseconds. */
    this.renderTimeMs = renderTimeMs;
  }

  /** References of the resources that could not be loaded, e.g. ['img/missing.png']. */
  get missingResources() {
    return this.failures.map((f) => f.ref);
  }
}

module.exports = { Result };
