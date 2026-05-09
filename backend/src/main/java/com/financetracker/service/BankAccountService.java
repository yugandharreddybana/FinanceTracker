package com.financetracker.service;

import com.financetracker.model.BankAccount;
import com.financetracker.repository.BankAccountRepository;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BankAccountService {
    private final BankAccountRepository repo;

    @Transactional(readOnly = true)
    public List<BankAccount> findAllByUserId(String userId) {
        return repo.findAllByUserId(userId);
    }

    @Transactional
    public BankAccount create(BankAccount account) {
        if (account.getId() == null || account.getId().isBlank()) {
            // Phase5.0013: UUID — millisecond timestamps collide under burst
            // creation (two accounts in the same ms → DB integrity violation).
            account.setId("acc-" + UUID.randomUUID());
        }
        if (Boolean.TRUE.equals(account.getIsPrimary())) {
            demoteOtherPrimaries(account.getUserId(), account.getCurrency(), account.getId());
        }
        return repo.save(account);
    }

    @SuppressWarnings("null")
    @Transactional
    public BankAccount update(String id, BankAccount updates, String requestUserId) {
        BankAccount existing = repo.findById(id).orElseThrow(() -> new com.financetracker.exception.NotFoundException("Account not found: " + id));
        Guards.assertOwner(existing.getUserId(), requestUserId);

        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getType() != null) existing.setType(updates.getType());
        // Phase4.0001: balance is server-managed only — derived from transaction
        // deltas (TransactionService.applyBalanceDelta). Accepting it from the
        // client would let any user PUT { "balance": 9_999_999 } and overwrite
        // the ledger. Initial balance is set on create() only.
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
        if (updates.getIsJoint() != null) existing.setIsJoint(updates.getIsJoint());
        if (updates.getIsPrimary() != null) {
            existing.setIsPrimary(updates.getIsPrimary());
            if (Boolean.TRUE.equals(updates.getIsPrimary())) {
                demoteOtherPrimaries(existing.getUserId(), existing.getCurrency(), existing.getId());
            }
        }
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id, String requestUserId) {
        BankAccount existing = repo.findById(id).orElseThrow(() -> new com.financetracker.exception.NotFoundException("Account not found: " + id));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        repo.deleteById(id);
    }

    // Enforce: at most one primary per (user, currency). Promoting one demotes siblings sharing the same currency.
    private void demoteOtherPrimaries(String userId, String currency, String keepId) {
        if (userId == null) return;
        List<BankAccount> siblings = currency != null
                ? repo.findAllByUserIdAndCurrencyAndIsPrimaryTrue(userId, currency)
                : repo.findAllByUserIdAndIsPrimaryTrue(userId);
        for (BankAccount b : siblings) {
            if (!b.getId().equals(keepId) && Boolean.TRUE.equals(b.getIsPrimary())) {
                b.setIsPrimary(false);
                repo.save(b);
            }
        }
    }
}
