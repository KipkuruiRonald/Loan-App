// Loan Calculator for Okoleo 9-Day Loan Product
// Based on Section 1.3 Modified Calculation Formulas

class LoanCalculator {
  constructor() {
    // Okoleo 9-Day Loan Parameters
    this.TERM_DAYS = 9;
    this.ANNUAL_INTEREST_RATE = 0.04; // 4%
    this.PENALTY_RATE = 0.068; // 6.8% of principal
    this.PROCESSING_FEE = 0.0; // Flat fee (TBD)
    this.CURRENCY = "KSh";
  }
  
  /**
   * Calculate total amount due for a 9-day loan using Okoleo rate logic.
   * 
   * Formula:
   * total_due = principal 
   *           + (principal × 0.04 ÷ 365 × 9)
   *           + processing_fee
   *           + IF late_days > 0 THEN (principal × 0.068) + (principal × 0.04 ÷ 365 × late_days)
   */
  calculateTotalDue(principal, termDays = this.TERM_DAYS, processingFee = this.PROCESSING_FEE, lateDays = 0) {
    // Daily interest rate
    const dailyRate = this.ANNUAL_INTEREST_RATE / 365;
    
    // Interest for the term
    const interestAmount = principal * dailyRate * termDays;
    
    // Late penalty (6.8% of principal, not outstanding)
    let latePenalty = 0.0;
    let lateInterest = 0.0;
    
    if (lateDays > 0) {
      latePenalty = principal * this.PENALTY_RATE;
      lateInterest = principal * dailyRate * lateDays;
    }
    
    // Total due
    const totalDue = principal + interestAmount + processingFee + latePenalty + lateInterest;
    
    return {
      principal: principal,
      interestRateAnnual: this.ANNUAL_INTEREST_RATE,
      termDays: termDays,
      interestAmount: parseFloat(interestAmount.toFixed(2)),
      processingFee: processingFee,
      lateDays: lateDays,
      latePenaltyAmount: parseFloat(latePenalty.toFixed(2)),
      lateInterestAmount: parseFloat(lateInterest.toFixed(2)),
      totalDue: parseFloat(totalDue.toFixed(2)),
      currency: this.CURRENCY
    };
  }
  
  /**
   * Generate a loan quote with all charges
   */
  calculateQuote(principal, dueDate) {
    const calculation = this.calculateTotalDue(principal);
    
    return {
      quoteId: `QUOTE-${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}`,
      principal: principal,
      calculation: calculation,
      validUntil: new Date(dueDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
    };
  }
}

module.exports = new LoanCalculator();
