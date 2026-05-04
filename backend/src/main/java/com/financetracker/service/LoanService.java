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
        return repo.findAllByUserId(userId);
    }

    @Transactional
    public Loan create(Loan loan) {
        // ISSUE #16 FIX: UUID-based ID
        loan.setId("loan-" + UUID.randomUUID());
        // ISSUE #5 FIX: Strip client-supplied payments; server generates amortisation
        loan.setPayments(generateAmortisation(loan));
        return repo.save(loan);
    }

    @Transactional
    public Loan update(String id, Loan updates, String requestUserId) {
        Loan existing = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Loan not found"));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getTotalAmount() != null) existing.setTotalAmount(updates.getTotalAmount());
        if (updates.getRemainingAmount() != null) existing.setRemainingAmount(updates.getRemainingAmount());
        if (updates.getInterestRate() != null) existing.setInterestRate(updates.getInterestRate());
        if (updates.getTenureYears() != null) existing.setTenureYears(updates.getTenureYears());
        if (updates.getStartDate() != null) existing.setStartDate(updates.getStartDate());
        if (updates.getEndDate() != null) existing.setEndDate(updates.getEndDate());
        if (updates.getCategory() != null) existing.setCategory(updates.getCategory());
        if (updates.getColor() != null) existing.setColor(updates.getColor());
        if (updates.getCurrency() != null) existing.setCurrency(updates.getCurrency());
        // ISSUE #5 FIX: Recalculate amortisation on structural changes — never accept client payments
        if (updates.getInterestRate() != null || updates.getTenureYears() != null || updates.getTotalAmount() != null) {
            existing.setPayments(generateAmortisation(existing));
        }
        existing.setMonthlyEMI(computeEMI(
            existing.getTotalAmount(),
            existing.getInterestRate(),
            existing.getTenureYears() != null ? existing.getTenureYears() * 12 : 0
        ));
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id, String requestUserId) {
        Loan existing = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Loan not found"));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        repo.deleteById(id);
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
            LocalDate date = loan.getStartDate() != null
                ? LocalDate.parse(loan.getStartDate()).plusMonths(1)
                : LocalDate.now().plusMonths(1);
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
        LocalDate startDate = loan.getStartDate() != null
            ? LocalDate.parse(loan.getStartDate())
            : LocalDate.now();
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
}
