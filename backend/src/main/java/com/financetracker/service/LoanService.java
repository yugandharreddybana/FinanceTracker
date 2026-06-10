package com.financetracker.service;

import com.financetracker.model.Loan;
import com.financetracker.repository.LoanRepository;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LoanService {
    private final LoanRepository repo;

    @Transactional(readOnly = true)
    public List<Loan> findAllByUserId(String userId) {
        // ISSUE 4.054 FIX: Filter out soft-deleted loans.
        return repo.findAllByUserIdAndDeletedFalse(userId);
    }

    @Transactional
    public Loan create(Loan loan) {
        // ISSUE #16 FIX: UUID-based ID
        loan.setId("loan-" + UUID.randomUUID());
        // ISSUE #5 FIX: Strip client-supplied payments; server generates amortisation
        loan.setPayments(generateAmortisation(loan));
        syncLoanState(loan);
        return repo.save(loan);
    }

    @Transactional
    public Loan update(String id, Loan updates, String requestUserId) {
        Loan existing = repo.findById(id)
            .orElseThrow(() -> new com.financetracker.exception.NotFoundException("Loan not found"));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getTotalAmount() != null) existing.setTotalAmount(updates.getTotalAmount());
        // Phase4.028: Client cannot manually overwrite remainingAmount. It is calculated by syncLoanState().
        if (updates.getInterestRate() != null) existing.setInterestRate(updates.getInterestRate());
        if (updates.getTenureYears() != null) existing.setTenureYears(updates.getTenureYears());
        if (updates.getStartDate() != null) existing.setStartDate(updates.getStartDate());
        // Phase4.029: Client cannot manually overwrite endDate. It is calculated by syncLoanState().
        if (updates.getCategory() != null) existing.setCategory(updates.getCategory());
        if (updates.getColor() != null) existing.setColor(updates.getColor());
        if (updates.getCurrency() != null) existing.setCurrency(updates.getCurrency());
        // ISSUE #5 FIX: Recalculate amortisation on structural changes — never accept client payments
        if (updates.getInterestRate() != null || updates.getTenureYears() != null || updates.getTotalAmount() != null || updates.getStartDate() != null) {
            existing.setPayments(generateAmortisation(existing));
        }
        existing.setMonthlyEMI(computeEMI(
            existing.getTotalAmount(),
            existing.getInterestRate(),
            existing.getTenureYears() != null ? existing.getTenureYears() * 12 : 0
        ));
        syncLoanState(existing);
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id, String requestUserId) {
        Loan existing = repo.findById(id)
            .orElseThrow(() -> new com.financetracker.exception.NotFoundException("Loan not found"));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        // ISSUE 4.054 FIX: Enforce soft-delete for consistency.
        existing.setDeleted(true);
        existing.setDeletedAt(java.time.Instant.now());
        repo.save(existing);
    }

    /**
     * ISSUE #5 FIX: Server-side standard amortisation schedule.
     * Uses BigDecimal with HALF_EVEN (banker's rounding) throughout.
     * Formula: M = P * r(1+r)^n / ((1+r)^n - 1)
     */
    public List<Loan.LoanPayment> generateAmortisation(Loan loan) {
        if (loan.getTotalAmount() == null || loan.getInterestRate() == null || loan.getTenureYears() == null) {
            return List.of();
        }
        // Phase5.0007: belt-and-braces runtime guard. Bean Validation should
        // already have rejected these inputs at the controller, but defence in
        // depth: a negative rate divides by ((1+r)^n - 1) = 0, and tenure 0
        // would make n = 0 and crash the loop / produce NaN.
        if (loan.getInterestRate().signum() < 0 || loan.getInterestRate().compareTo(new BigDecimal("100")) > 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "interestRate out of range [0, 100]");
        }
        if (loan.getTenureYears() < 1 || loan.getTenureYears() > 50) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "tenureYears out of range [1, 50]");
        }
        if (loan.getTotalAmount().signum() <= 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "totalAmount must be positive");
        }
        int n = loan.getTenureYears() * 12;
        BigDecimal principal = loan.getTotalAmount();
        BigDecimal annualRate = loan.getInterestRate();
        // Monthly rate with high precision
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(1200), 10, RoundingMode.HALF_EVEN);
        List<Loan.LoanPayment> schedule = new ArrayList<>();
        if (monthlyRate.compareTo(BigDecimal.ZERO) == 0) {
            // Zero-interest loan: equal principal payments
            BigDecimal payment = principal.divide(BigDecimal.valueOf(n), 2, RoundingMode.HALF_EVEN);
            BigDecimal balance = principal;
            // Phase4.030: Bulletproof date parsing prevents internal crashes from client payloads.
            LocalDate date = safeParseStartDate(loan.getStartDate()).plusMonths(1);
            for (int i = 0; i < n; i++) {
                schedule.add(new Loan.LoanPayment(
                    date.plusMonths(i).toString(), payment, payment, BigDecimal.ZERO
                ));
            }
            return schedule;
        }
        // Standard amortisation
        BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate);
        BigDecimal onePlusRpowN = onePlusR.pow(n, new MathContext(15, RoundingMode.HALF_EVEN));
        BigDecimal emi = principal
            .multiply(monthlyRate.multiply(onePlusRpowN))
            .divide(onePlusRpowN.subtract(BigDecimal.ONE), 2, RoundingMode.HALF_EVEN);
        loan.setMonthlyEMI(emi);
        BigDecimal balance = principal;
        // Phase4.030: Safe-parse ensures bad user formats yield explicit HTTP 400s.
        LocalDate startDate = safeParseStartDate(loan.getStartDate());
        for (int i = 1; i <= n && balance.compareTo(BigDecimal.ZERO) > 0; i++) {
            BigDecimal interest = balance.multiply(monthlyRate).setScale(2, RoundingMode.HALF_EVEN);
            BigDecimal principalPayment = emi.subtract(interest).setScale(2, RoundingMode.HALF_EVEN);
            if (principalPayment.compareTo(balance) > 0) principalPayment = balance;
            balance = balance.subtract(principalPayment).setScale(2, RoundingMode.HALF_EVEN);
            schedule.add(new Loan.LoanPayment(
                startDate.plusMonths(i).toString(),
                principalPayment.add(interest).setScale(2, RoundingMode.HALF_EVEN),
                principalPayment,
                interest
            ));
        }
        return schedule;
    }

    private BigDecimal computeEMI(BigDecimal principal, BigDecimal annualRate, int n) {
        if (principal == null || annualRate == null || n <= 0) return BigDecimal.ZERO;
        BigDecimal r = annualRate.divide(BigDecimal.valueOf(1200), 10, RoundingMode.HALF_EVEN);
        if (r.compareTo(BigDecimal.ZERO) == 0) {
            return principal.divide(BigDecimal.valueOf(n), 2, RoundingMode.HALF_EVEN);
        }
        BigDecimal onePlusRpowN = BigDecimal.ONE.add(r).pow(n, new MathContext(15, RoundingMode.HALF_EVEN));
        return principal.multiply(r.multiply(onePlusRpowN))
            .divide(onePlusRpowN.subtract(BigDecimal.ONE), 2, RoundingMode.HALF_EVEN);
    }

    private LocalDate safeParseStartDate(String startDateStr) {
        if (startDateStr == null || startDateStr.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(startDateStr);
        } catch (java.time.format.DateTimeParseException e) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid loan startDate format: " + startDateStr);
        }
    }

    private void syncLoanState(Loan loan) {
        if (loan.getPayments() != null && !loan.getPayments().isEmpty()) {
            // Phase4.029: Auto-align endpoint bounds.
            loan.setEndDate(loan.getPayments().get(loan.getPayments().size() - 1).getDate());
        }
        // Phase4.028: Drive authoritative balance logically.
        loan.setRemainingAmount(recomputeRemainingAmount(loan));
    }

    private BigDecimal recomputeRemainingAmount(Loan loan) {
        if (loan.getTotalAmount() == null) return BigDecimal.ZERO;
        if (loan.getPayments() == null || loan.getPayments().isEmpty()) {
            return loan.getTotalAmount();
        }
        LocalDate now = LocalDate.now();
        BigDecimal paidPrincipal = BigDecimal.ZERO;
        for (Loan.LoanPayment p : loan.getPayments()) {
            try {
                LocalDate pDate = LocalDate.parse(p.getDate());
                if (!pDate.isAfter(now)) {
                    paidPrincipal = paidPrincipal.add(p.getPrincipal() != null ? p.getPrincipal() : BigDecimal.ZERO);
                }
            } catch (Exception ignored) {}
        }
        return loan.getTotalAmount().subtract(paidPrincipal).max(BigDecimal.ZERO);
    }
}
