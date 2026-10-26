import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
interface Trade {
  id: number;
  date: string;
  symbol: string;
  tradeType: 'Intraday' | 'Delivery' | 'Options';
  investment: number;
  profitLoss: number;
  brokerage: number;
  notes: string;
  screenshot?: string | null;
}

interface TradingTask {
  id: number;
  title: string;
  completed: boolean;
}
@Component({
  selector: 'app-trading-journal',
  imports: [FormsModule,CommonModule],
  templateUrl: './trading-journal.html',
  styleUrl: './trading-journal.css',
})
export class TradingJournal {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly today = this.getToday();

  selectedDate = signal(this.today);
  searchText = signal('');
  trades = signal<Trade[]>([]);
  accountBalance = signal(0);

  showTradeForm = signal(false);
  tradeScreenshot = signal<string | null>(null);
  selectedScreenshot = signal<string | null>(null);

  fundInput: number | null = null;

  form = {
    symbol: '',
    tradeType: 'Intraday' as Trade['tradeType'],
    investment: null as number | null,
    profitLoss: null as number | null,
    brokerage: 0,
    notes: ''
  };

  // Trades for the selected date
  dailyTrades = computed(() =>
    this.trades().filter(
      trade => trade.date === this.selectedDate()
    )
  );

  // Search by symbol, trade type or notes
  filteredTrades = computed(() => {
    const search = this.searchText().trim().toLowerCase();

    if (!search) {
      return this.dailyTrades();
    }

    return this.dailyTrades().filter(trade =>
      trade.symbol.toLowerCase().includes(search) ||
      trade.tradeType.toLowerCase().includes(search) ||
      trade.notes.toLowerCase().includes(search)
    );
  });

  grossProfitLoss = computed(() =>
    this.dailyTrades().reduce(
      (total, trade) => total + trade.profitLoss,
      0
    )
  );

  totalBrokerage = computed(() =>
    this.dailyTrades().reduce(
      (total, trade) => total + trade.brokerage,
      0
    )
  );

  netProfitLoss = computed(() =>
    this.grossProfitLoss() - this.totalBrokerage()
  );

  winningTrades = computed(() =>
    this.dailyTrades().filter(trade => trade.profitLoss > 0).length
  );

  losingTrades = computed(() =>
    this.dailyTrades().filter(trade => trade.profitLoss < 0).length
  );

  constructor() {
    if (this.isBrowser) {
      this.loadData();
    }
  }

  private getToday(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private loadData(): void {
    try {
      const savedTrades = localStorage.getItem('trading-journal-trades');
      const savedBalance = localStorage.getItem(
        'trading-journal-account-balance'
      );
      const oldFunds = localStorage.getItem('trading-journal-funds');

      if (savedTrades) {
        const parsed: unknown = JSON.parse(savedTrades);

        if (Array.isArray(parsed)) {
          this.trades.set(parsed as Trade[]);
        }
      }

      if (savedBalance !== null) {
        const balance = Number(savedBalance);

        if (Number.isFinite(balance)) {
          this.accountBalance.set(balance);
        }
      } else {
        // Migrate balance from the previous version.
        const previousFunds =
          oldFunds === null ? 0 : Number(oldFunds);

        const startingFunds =
          Number.isFinite(previousFunds) && previousFunds >= 0
            ? previousFunds
            : 0;

        const previousNetPnL = this.trades().reduce(
          (total, trade) =>
            total +
            (Number(trade.profitLoss) || 0) -
            (Number(trade.brokerage) || 0),
          0
        );

        this.accountBalance.set(startingFunds + previousNetPnL);
        this.saveAccountBalance();
      }
    } catch {
      console.warn('Unable to load Triplex Trader data.');
    }
  }

  private saveTrades(): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(
        'trading-journal-trades',
        JSON.stringify(this.trades())
      );
    } catch {
      alert(
        'Unable to save trades. Browser storage may be full. ' +
        'Try using smaller screenshots or removing old screenshots.'
      );
    }
  }

  private saveAccountBalance(): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(
        'trading-journal-account-balance',
        String(this.accountBalance())
      );
    } catch {
      console.warn('Unable to save account balance.');
    }
  }

  // Directly edit Account Balance
  onBalanceChange(value: number | string | null): void {
    if (value === null || value === '') {
      return;
    }

    const balance = Number(value);

    if (!Number.isFinite(balance) || balance < 0) {
      return;
    }

    this.accountBalance.set(balance);
    this.saveAccountBalance();
  }

  toNumber(value: number | null | undefined): number {
    return Number(value ?? 0);
  }

  onDateChange(value: string): void {
    if (!value) {
      return;
    }

    this.selectedDate.set(value);
    this.searchText.set('');
  }

  addFunds(): void {
    const amount = Number(this.fundInput);

    if (
      this.fundInput === null ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      alert('Please enter a valid amount greater than zero.');
      return;
    }

    this.accountBalance.update(balance => balance + amount);
    this.saveAccountBalance();
    this.fundInput = null;
  }

  onScreenshotSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Screenshot size must be 2 MB or less.');
      input.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.tradeScreenshot.set(reader.result);
      }
    };

    reader.onerror = () => {
      alert('Unable to read the screenshot. Please try again.');
      input.value = '';
    };

    reader.readAsDataURL(file);
  }

  removeScreenshot(): void {
    this.tradeScreenshot.set(null);
  }

  openScreenshot(screenshot: string | null | undefined): void {
    if (screenshot) {
      this.selectedScreenshot.set(screenshot);
    }
  }

  closeScreenshot(): void {
    this.selectedScreenshot.set(null);
  }

  addTrade(): void {
    const symbol = this.form.symbol.trim();
    const investment = Number(this.form.investment);
    const profitLoss = Number(this.form.profitLoss);
    const brokerage = Number(this.form.brokerage);

    if (!symbol) {
      alert('Please enter a stock or trading symbol.');
      return;
    }

    if (
      this.form.investment === null ||
      !Number.isFinite(investment) ||
      investment <= 0
    ) {
      alert('Please enter a valid investment amount.');
      return;
    }

    if (
      this.form.profitLoss === null ||
      !Number.isFinite(profitLoss)
    ) {
      alert('Please enter the trade profit or loss.');
      return;
    }

    if (!Number.isFinite(brokerage) || brokerage < 0) {
      alert('Brokerage cannot be negative.');
      return;
    }

    const trade: Trade = {
      id: Date.now(),
      date: this.selectedDate(),
      symbol: symbol.toUpperCase(),
      tradeType: this.form.tradeType,
      investment,
      profitLoss,
      brokerage,
      notes: this.form.notes.trim(),
      screenshot: this.tradeScreenshot()
    };

    this.trades.update(items => [trade, ...items]);
    this.saveTrades();

    // Add realised P&L after brokerage to the account balance.
    this.accountBalance.update(
      balance => balance + profitLoss - brokerage
    );
    this.saveAccountBalance();

    this.resetForm();
  }

  deleteTrade(id: number): void {
    const trade = this.trades().find(item => item.id === id);

    if (!trade || !this.isBrowser) {
      return;
    }

    const confirmed = window.confirm(
      'Delete this trade? Its net P&L will be reversed from Account Balance.'
    );

    if (!confirmed) {
      return;
    }

    this.trades.update(items =>
      items.filter(item => item.id !== id)
    );

    const tradeNetPnL = trade.profitLoss - trade.brokerage;

    this.accountBalance.update(
      balance => balance - tradeNetPnL
    );

    this.saveTrades();
    this.saveAccountBalance();
  }

  resetForm(): void {
    this.form = {
      symbol: '',
      tradeType: 'Intraday',
      investment: null,
      profitLoss: null,
      brokerage: 0,
      notes: ''
    };

    this.tradeScreenshot.set(null);
    this.showTradeForm.set(false);
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
}