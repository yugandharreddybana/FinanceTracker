package com.financetracker.scheduler;

import com.financetracker.model.RecurringPayment;
import com.financetracker.model.Transaction;
import com.financetracker.repository.RecurringPaymentRepository;
import com.financetracker.service.TransactionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

/**
 * ISSUE #2 FIX: Executes due recurring payments daily at 00:01 UTC.
 * For each due RecurringPayment, creates a real Transaction, appends to payment history,
 * and advances the dueDate to the next occurrence.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RecurringPaymentScheduler {
    private final RecurringPaymentRepository repo;
    private final TransactionService txService;

    @Scheduled(cron = "0 1 0 * * *", zone = "UTC")
    @Transactional
    public void fireRecurringPayments() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        List<RecurringPayment> due = repo.findAllDueOn(today);
        log.info("[RecurringPaymentScheduler] {} payments due on {}", due.size(), today);
        for (RecurringPayment rp : due) {
            try {
                Transaction tx = Transaction.builder()
                    .id("tx-" + UUID.randomUUID())
                    .idempotencyKey("rec-" + rp.getId() + "-" + today)
                    .userId(rp.getUserId())
                    .merchant(rp.getName())
                    .amount(rp.getAmount())
                    .category(rp.getCategory())
                    .type("EXPENSE")
                    .status("CLEARED")
                    .account(rp.getPaymentMethod())
                    .currency(rp.getCurrency())
                    .transactionDate(today)
                    .build();
                txService.create(tx);
                // Append to payment history
                java.util.List<RecurringPayment.PaymentHistory> history =
                    new java.util.ArrayList<>(rp.getHistory() != null ? rp.getHistory() : List.of());
                history.add(new RecurringPayment.PaymentHistory(
                    today.toString(), rp.getAmount(), "PAID"
                ));
                rp.setHistory(history);
                // Advance dueDate to next occurrence
                rp.setDueDate(nextOccurrence(rp, today).toString());
                repo.save(rp);
                log.info("[RecurringPaymentScheduler] Fired payment for {} (user: {})",
                    rp.getName(), rp.getUserId());
            } catch (Exception e) {
                // Isolated per-payment: one failure does not block other payments
                log.error("[RecurringPaymentScheduler] Failed to fire payment {} : {}",
                    rp.getId(), e.getMessage(), e);
            }
        }
    }

    private LocalDate nextOccurrence(RecurringPayment rp, LocalDate from) {
        String freq = rp.getFrequency() != null ? rp.getFrequency().toUpperCase() : "MONTHLY";
        return switch (freq) {
            case "WEEKLY"     -> from.plusWeeks(1);
            case "BI_WEEKLY",
                 "BIWEEKLY"   -> from.plusWeeks(2);
            case "QUARTERLY"  -> from.plusMonths(3);
            case "ANNUAL",
                 "YEARLY"     -> from.plusYears(1);
            default           -> from.plusMonths(1); // MONTHLY
        };
    }
}
