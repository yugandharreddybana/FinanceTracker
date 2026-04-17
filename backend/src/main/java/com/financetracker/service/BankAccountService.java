package com.financetracker.service;

import com.financetracker.model.BankAccount;
import com.financetracker.repository.BankAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BankAccountService {
    private final BankAccountRepository repo;

    @Transactional(readOnly = true)
    public List<BankAccount> findAll() {
        return repo.findAll();
    }

    @Transactional
    public BankAccount create(BankAccount account) {
        if (account.getId() == null || account.getId().isBlank()) {
            account.setId("acc-" + System.currentTimeMillis());
        }
        return repo.save(account);
    }

    @SuppressWarnings("null")
    @Transactional
    public BankAccount update(String id, BankAccount updates) {
        BankAccount existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Account not found: " + id));
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getType() != null) existing.setType(updates.getType());
        if (updates.getBalance() != null) existing.setBalance(updates.getBalance());
        if (updates.getBank() != null) existing.setBank(updates.getBank());
        if (updates.getColor() != null) existing.setColor(updates.getColor());
        if (updates.getLastSynced() != null) existing.setLastSynced(updates.getLastSynced());
        if (updates.getCurrency() != null) existing.setCurrency(updates.getCurrency());
        if (updates.getCreditLimit() != null) existing.setCreditLimit(updates.getCreditLimit());
        if (updates.getDueDate() != null) existing.setDueDate(updates.getDueDate());
        if (updates.getApr() != null) existing.setApr(updates.getApr());
        if (updates.getMinPayment() != null) existing.setMinPayment(updates.getMinPayment());
        if (updates.getCardNetwork() != null) existing.setCardNetwork(updates.getCardNetwork());
        if (updates.getCardNumberLast4() != null) existing.setCardNumberLast4(updates.getCardNumberLast4());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id) {
        repo.deleteById(id);
    }
}
