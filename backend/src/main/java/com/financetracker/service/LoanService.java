package com.financetracker.service;

import com.financetracker.model.Loan;
import com.financetracker.repository.LoanRepository;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

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
        if (loan.getId() == null || loan.getId().isBlank()) {
            loan.setId("loan-" + System.currentTimeMillis());
        }
        return repo.save(loan);
    }

    @SuppressWarnings("null")
    @Transactional
    public Loan update(String id, Loan updates, String requestUserId) {
        Loan existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Loan not found: " + id));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getTotalAmount() != null) existing.setTotalAmount(updates.getTotalAmount());
        if (updates.getRemainingAmount() != null) existing.setRemainingAmount(updates.getRemainingAmount());
        if (updates.getMonthlyEMI() != null) existing.setMonthlyEMI(updates.getMonthlyEMI());
        if (updates.getInterestRate() != null) existing.setInterestRate(updates.getInterestRate());
        if (updates.getTenureYears() != null) existing.setTenureYears(updates.getTenureYears());
        if (updates.getStartDate() != null) existing.setStartDate(updates.getStartDate());
        if (updates.getEndDate() != null) existing.setEndDate(updates.getEndDate());
        if (updates.getCategory() != null) existing.setCategory(updates.getCategory());
        if (updates.getColor() != null) existing.setColor(updates.getColor());
        if (updates.getCurrency() != null) existing.setCurrency(updates.getCurrency());
        if (updates.getPayments() != null) existing.setPayments(updates.getPayments());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id, String requestUserId) {
        Loan existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Loan not found: " + id));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        repo.deleteById(id);
    }
}
