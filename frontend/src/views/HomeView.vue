<template>
  <div class="page home-view" dir="rtl">
    <div class="home-view__backdrop" />

    <div class="home-view__container">
      <section class="home-mobile lg:hidden">
        <header class="mobile-header">
          <button type="button" class="icon-button" aria-label="اعلان‌ها">
            <Bell :size="22" :stroke-width="2.2" />
            <span class="icon-button__dot" />
          </button>

          <div class="mobile-header__brand">
            <p class="mobile-header__date">{{ fullDateLabel }}</p>
            <h1 class="mobile-header__title">هم‌بافت</h1>
          </div>

          <div class="mobile-user">
            <div class="mobile-user__copy">
              <p class="mobile-user__greeting">{{ greeting }}</p>
              <p class="mobile-user__name">{{ displayName }}</p>
            </div>
            <div class="mobile-user__avatar">{{ displayInitial }}</div>
          </div>
        </header>

        <section class="score-card">
          <div class="score-card__content">
            <div>
              <p class="section-eyebrow">امتیاز امروز</p>
              <div class="score-card__value">{{ scoreDisplay }}</div>
              <p class="score-card__message">{{ scoreMessage }}</p>
              <div class="score-card__encouragement">
                <Sparkles :size="14" :stroke-width="2.2" />
                <span>{{ encouragement }}</span>
              </div>
            </div>

            <div class="score-orbit">
              <div class="score-orbit__segment score-orbit__segment--pink" />
              <div class="score-orbit__segment score-orbit__segment--yellow" />
              <div class="score-orbit__segment score-orbit__segment--green" />
              <div class="score-orbit__segment score-orbit__segment--blue" />
              <div class="score-orbit__core">
                <div class="score-orbit__flower">✦</div>
              </div>
              <div class="score-orbit__badge score-orbit__badge--top-right">
                <WalletCards :size="16" :stroke-width="2.2" />
              </div>
              <div class="score-orbit__badge score-orbit__badge--right">
                <Leaf :size="16" :stroke-width="2.2" />
              </div>
              <div class="score-orbit__badge score-orbit__badge--bottom-left">
                <Scale :size="16" :stroke-width="2.2" />
              </div>
              <div class="score-orbit__badge score-orbit__badge--left">
                <Heart :size="16" :stroke-width="2.2" />
              </div>
            </div>
          </div>

          <div class="score-metrics">
            <article
              v-for="metric in scoreMetrics"
              :key="metric.label"
              class="score-metric"
            >
              <div class="score-metric__head">
                <span class="score-metric__icon" :style="{ background: metric.bg }">
                  <component :is="metric.icon" :size="16" :stroke-width="2.2" />
                </span>
                <div>
                  <p class="score-metric__label">{{ metric.label }}</p>
                  <p class="score-metric__value">{{ metric.value }}</p>
                </div>
              </div>
              <div class="soft-progress">
                <span :style="{ width: `${metric.percent}%`, background: metric.bar }" />
              </div>
            </article>
          </div>
        </section>

        <section class="soft-card section-card">
          <div class="section-head">
            <h2>نمای کلی امروز</h2>
            <CircleDashed :size="18" :stroke-width="2.2" />
          </div>

          <div class="summary-grid">
            <article
              v-for="card in summaryCards"
              :key="card.label"
              class="summary-card"
              :style="{ background: card.bg }"
            >
              <span class="summary-card__icon">
                <component :is="card.icon" :size="18" :stroke-width="2.2" />
              </span>
              <div>
                <p class="summary-card__label">{{ card.label }}</p>
                <p class="summary-card__value">{{ card.value }}</p>
                <p class="summary-card__caption">{{ card.caption }}</p>
              </div>
            </article>
          </div>
        </section>

        <section class="priority-card">
          <div class="priority-card__header">
            <div>
              <p class="section-eyebrow">اولویت اصلی امروز</p>
              <h2 class="priority-card__title">{{ priorityTitle }}</h2>
              <p class="priority-card__subtitle">{{ prioritySubtitle }}</p>
            </div>
            <div class="priority-card__bookmark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 3.75l2.4 4.86 5.37.78-3.88 3.78.92 5.34L12 15.96l-4.81 2.55.92-5.34L4.23 9.39l5.37-.78L12 3.75z" />
              </svg>
            </div>
          </div>

          <div class="priority-card__meta">
            <span class="priority-pill priority-pill--ghost">{{ priorityTime }}</span>
            <span class="priority-pill" :class="priorityPillClass">{{ priorityLabel }}</span>
            <span class="priority-pill priority-pill--ghost">{{ priorityTypeLabel }}</span>
          </div>

          <div class="priority-card__footer">
            <div v-if="priorityAttendees.length" class="attendees">
              <div
                v-for="(attendee, index) in priorityAttendees.slice(0, 3)"
                :key="`${attendee.name || attendee.email || index}`"
                class="attendee"
              >
                {{ attendeeInitial(attendee) }}
              </div>
              <div v-if="priorityAttendees.length > 3" class="attendee attendee--count">
                +{{ toPersianDigits(priorityAttendees.length - 3) }}
              </div>
            </div>
            <div v-else class="priority-card__solo">فقط برای خودت</div>

            <button type="button" class="cta-button cta-button--dark" @click="openPriority">
              <span>شروع یا مشاهده</span>
              <ChevronLeft :size="18" :stroke-width="2.2" />
            </button>
          </div>
        </section>

        <div class="mobile-split">
          <section class="soft-card section-card">
            <div class="section-head">
              <h2>کارهای امروز</h2>
              <RouterLink to="/tasks" class="section-link">مشاهده همه</RouterLink>
            </div>

            <div v-if="todayTasks.length" class="task-list">
              <article
                v-for="task in todayTasks"
                :key="task.name || task.title"
                class="task-row"
              >
                <button
                  type="button"
                  class="task-row__check"
                  :class="{ 'task-row__check--done': isTaskDone(task) }"
                  @click="completeTaskItem(task)"
                >
                  <Check v-if="isTaskDone(task)" :size="16" :stroke-width="2.5" />
                </button>

                <div class="task-row__body">
                  <div class="task-row__top">
                    <h3 :class="{ 'line-through text-[var(--color-text-tertiary)]': isTaskDone(task) }">
                      {{ task.title }}
                    </h3>
                    <span class="task-priority" :class="taskPriorityClass(task.priority)">{{ priorityLabelFor(task.priority) }}</span>
                  </div>
                  <p class="task-row__sub">{{ task.description || 'بدون توضیح اضافه' }}</p>
                  <div class="task-row__meta">
                    <span>{{ taskTime(task) }}</span>
                    <span>{{ taskStatusLabel(task.status) }}</span>
                  </div>
                </div>
              </article>
            </div>

            <div v-else-if="isBusy" class="stack-skeleton">
              <div v-for="index in 3" :key="index" class="skeleton-row" />
            </div>

            <div v-else class="empty-state">
              <p class="empty-state__title">امروز کارت سبک است</p>
              <p class="empty-state__caption">اگر خواستی از دکمه‌ی پایین یک کار تازه اضافه کن.</p>
            </div>
          </section>

          <section class="soft-card section-card">
            <div class="section-head">
              <h2>وضعیت مالی</h2>
              <RouterLink to="/finance" class="section-link">جزئیات</RouterLink>
            </div>

            <div class="finance-card__numbers">
              <div>
                <p class="finance-card__label">خرج این ماه</p>
                <p class="finance-card__amount">{{ financeMonthExpense }}</p>
              </div>
              <div>
                <p class="finance-card__label">بودجه باقی‌مانده</p>
                <p class="finance-card__amount finance-card__amount--muted">{{ financeRemainingBudget }}</p>
              </div>
            </div>

            <div class="soft-progress finance-card__progress">
              <span :style="{ width: `${financeProgress}%`, background: 'linear-gradient(90deg, #111111 0%, #3a352f 100%)' }" />
            </div>

            <div class="finance-card__payment">
              <p class="finance-card__label">پرداخت نزدیک</p>
              <template v-if="nextPayment">
                <h3>{{ nextPayment.title }}</h3>
                <p>{{ nextPaymentLabel }}</p>
              </template>
              <template v-else>
                <p class="empty-inline">پرداخت پیش‌رویی در ۷ روز آینده ثبت نشده.</p>
              </template>
            </div>
          </section>
        </div>

        <section class="soft-card section-card">
          <div class="section-head">
            <h2>عادت‌های امروز</h2>
            <RouterLink to="/habits" class="section-link">همه عادت‌ها</RouterLink>
          </div>

          <div v-if="habitRows.length" class="habit-list">
            <article
              v-for="habit in habitRows"
              :key="habit.name"
              class="habit-row"
            >
              <button
                type="button"
                class="habit-row__toggle"
                :class="{ 'habit-row__toggle--done': habit.done }"
                @click="toggleHabit(habit)"
              >
                <CheckCheck v-if="habit.done" :size="16" :stroke-width="2.4" />
                <CircleDashed v-else :size="16" :stroke-width="2.2" />
              </button>

              <div class="habit-row__body">
                <div class="habit-row__top">
                  <h3>{{ habit.name }}</h3>
                  <span>{{ habit.valueLabel }}</span>
                </div>
                <div class="soft-progress">
                  <span :style="{ width: `${habit.percent}%`, background: habit.bar }" />
                </div>
              </div>
            </article>
          </div>

          <div v-else-if="isBusy" class="stack-skeleton">
            <div v-for="index in 4" :key="index" class="skeleton-row skeleton-row--short" />
          </div>

          <div v-else class="empty-state">
            <p class="empty-state__title">عادت فعالی پیدا نشد</p>
            <p class="empty-state__caption">اولین عادت روزانه‌ات را اضافه کن تا اینجا خلاصه‌اش را ببینی.</p>
          </div>
        </section>

        <div class="mobile-split">
          <section class="soft-card section-card">
            <div class="section-head">
              <h2>برنامه‌ها</h2>
              <RouterLink to="/calendar" class="section-link">تقویم</RouterLink>
            </div>

            <div v-if="agendaItems.length" class="agenda-list">
              <article
                v-for="item in agendaItems"
                :key="`${item.title}-${item.starts_at}`"
                class="agenda-item"
                :style="{ background: agendaBackground(item) }"
              >
                <div>
                  <p class="agenda-item__time">{{ agendaTime(item) }}</p>
                  <h3>{{ item.title }}</h3>
                  <p class="agenda-item__type">{{ eventTypeLabel(item.event_type) }}</p>
                </div>
                <CalendarDays :size="18" :stroke-width="2.2" />
              </article>
            </div>

            <div v-else-if="isBusy" class="stack-skeleton">
              <div v-for="index in 2" :key="index" class="skeleton-row" />
            </div>

            <div v-else class="empty-state">
              <p class="empty-state__title">امروز برنامه‌ی ثبت‌شده‌ای نداری</p>
              <p class="empty-state__caption">اگر خواستی یک رویداد از تقویم اضافه کن.</p>
            </div>
          </section>

          <section class="soft-card section-card">
            <div class="section-head">
              <h2>هدف اصلی</h2>
              <RouterLink to="/goals" class="section-link">اهداف</RouterLink>
            </div>

            <template v-if="focusGoal">
              <div class="goal-card">
                <div class="goal-ring" :style="goalRingStyle">
                  <div class="goal-ring__inner">
                    <span>{{ focusGoalPercent }}</span>
                  </div>
                </div>

                <div class="goal-card__body">
                  <h3>{{ focusGoal.title }}</h3>
                  <p>{{ focusGoal.next_milestone || 'حرکت بعدی را مشخص کن تا اینجا دیده شود.' }}</p>
                  <div class="goal-card__meta">
                    <span>{{ focusGoalDateLabel }}</span>
                    <span>{{ focusGoalPercent }}</span>
                  </div>
                </div>
              </div>
            </template>

            <div v-else-if="isBusy" class="stack-skeleton">
              <div class="skeleton-row skeleton-row--tall" />
            </div>

            <div v-else class="empty-state">
              <p class="empty-state__title">فعلاً هدف فعالی نداری</p>
              <p class="empty-state__caption">یک هدف فعال بساز تا پیشرفتش اینجا بیاید.</p>
            </div>
          </section>
        </div>

        <section class="inspiration-card">
          <div class="section-head">
            <h2>انگیزه و یادآوری</h2>
            <Sparkles :size="18" :stroke-width="2.2" />
          </div>
          <p class="inspiration-card__text">{{ inspirationText }}</p>
          <p v-if="inspirationAuthor" class="inspiration-card__author">{{ inspirationAuthor }}</p>
        </section>
      </section>

      <section class="home-desktop hidden lg:block">
        <header class="desktop-header">
          <div class="desktop-header__main">
            <div class="desktop-header__identity">
              <p class="desktop-header__eyebrow">{{ fullDateLabel }}</p>
              <h1 class="desktop-header__title">{{ greeting }}</h1>
              <p class="desktop-header__subtitle">
                امروز خانه‌ی اصلی زندگی‌ات اینجاست؛ خلاصه، روشن و قابل کنترل.
              </p>
            </div>

            <div class="desktop-header__actions">
              <button type="button" class="soft-pill" @click="router.push('/calendar')">
                <CalendarDays :size="18" :stroke-width="2.2" />
                <span>تقویم روز</span>
              </button>
              <button type="button" class="soft-pill soft-pill--dark" @click="router.push('/tasks')">
                <Sparkles :size="18" :stroke-width="2.2" />
                <span>مدیریت کارها</span>
              </button>
              <button type="button" class="icon-button icon-button--desktop" aria-label="اعلان‌ها">
                <Bell :size="20" :stroke-width="2.2" />
                <span class="icon-button__dot" />
              </button>
            </div>
          </div>
        </header>

        <div class="desktop-grid">
          <section class="desktop-score soft-card">
            <div class="desktop-score__copy">
              <p class="section-eyebrow">امتیاز امروز</p>
              <div class="desktop-score__value">{{ scoreDisplay }}</div>
              <p class="desktop-score__message">{{ scoreMessage }}</p>
              <p class="desktop-score__caption">{{ encouragement }}</p>

              <div class="desktop-score__metrics">
                <article
                  v-for="metric in scoreMetrics"
                  :key="metric.label"
                  class="desktop-score__metric"
                >
                  <div class="desktop-score__metric-head">
                    <span class="score-metric__icon" :style="{ background: metric.bg }">
                      <component :is="metric.icon" :size="16" :stroke-width="2.2" />
                    </span>
                    <p>{{ metric.label }}</p>
                    <span>{{ metric.value }}</span>
                  </div>
                  <div class="soft-progress">
                    <span :style="{ width: `${metric.percent}%`, background: metric.bar }" />
                  </div>
                </article>
              </div>
            </div>

            <div class="desktop-score__visual">
              <div class="score-orbit score-orbit--desktop">
                <div class="score-orbit__segment score-orbit__segment--pink" />
                <div class="score-orbit__segment score-orbit__segment--yellow" />
                <div class="score-orbit__segment score-orbit__segment--green" />
                <div class="score-orbit__segment score-orbit__segment--blue" />
                <div class="score-orbit__core">
                  <div class="score-orbit__center-value">{{ scoreDisplay }}</div>
                  <div class="score-orbit__center-label">از ۱۰</div>
                </div>
                <div class="score-orbit__badge score-orbit__badge--top-right">
                  <WalletCards :size="18" :stroke-width="2.2" />
                </div>
                <div class="score-orbit__badge score-orbit__badge--right">
                  <Leaf :size="18" :stroke-width="2.2" />
                </div>
                <div class="score-orbit__badge score-orbit__badge--bottom-left">
                  <Scale :size="18" :stroke-width="2.2" />
                </div>
                <div class="score-orbit__badge score-orbit__badge--left">
                  <Heart :size="18" :stroke-width="2.2" />
                </div>
              </div>
            </div>
          </section>

          <section class="desktop-priority priority-card">
            <div class="priority-card__header">
              <div>
                <p class="section-eyebrow">اولویت اصلی امروز</p>
                <h2 class="priority-card__title">{{ priorityTitle }}</h2>
                <p class="priority-card__subtitle">{{ prioritySubtitle }}</p>
              </div>
              <div class="priority-card__bookmark">
                <Target :size="20" :stroke-width="2.2" />
              </div>
            </div>

            <div class="priority-card__meta">
              <span class="priority-pill priority-pill--ghost">{{ priorityTime }}</span>
              <span class="priority-pill" :class="priorityPillClass">{{ priorityLabel }}</span>
              <span class="priority-pill priority-pill--ghost">{{ priorityTypeLabel }}</span>
            </div>

            <div class="priority-card__footer">
              <div v-if="priorityAttendees.length" class="attendees">
                <div
                  v-for="(attendee, index) in priorityAttendees.slice(0, 4)"
                  :key="`${attendee.name || attendee.email || index}`"
                  class="attendee"
                >
                  {{ attendeeInitial(attendee) }}
                </div>
              </div>
              <div v-else class="priority-card__solo">فقط برای خودت</div>

              <button type="button" class="cta-button cta-button--dark" @click="openPriority">
                <span>رفتن به جزئیات</span>
                <ChevronLeft :size="18" :stroke-width="2.2" />
              </button>
            </div>

            <div class="desktop-priority__agenda">
              <div class="desktop-priority__agenda-head">
                <h3>برنامه بعدی</h3>
                <RouterLink to="/calendar" class="section-link">تقویم</RouterLink>
              </div>
              <template v-if="agendaItems.length">
                <article
                  v-for="item in agendaItems"
                  :key="`${item.title}-${item.starts_at}-desktop`"
                  class="desktop-priority__agenda-item"
                >
                  <div>
                    <p>{{ item.title }}</p>
                    <span>{{ eventTypeLabel(item.event_type) }}</span>
                  </div>
                  <strong>{{ agendaTime(item) }}</strong>
                </article>
              </template>
              <p v-else class="empty-inline">امروز برنامه‌ی بعدی ثبت نشده و فضا آزاد است.</p>
            </div>
          </section>
        </div>

        <section class="soft-card section-card desktop-summary">
          <div class="section-head">
            <h2>هایلایت‌های امروز</h2>
            <span class="section-tag">خلاصه‌ی سریع</span>
          </div>

          <div class="desktop-summary__grid">
            <article
              v-for="card in summaryCards"
              :key="`${card.label}-desktop`"
              class="summary-card summary-card--desktop"
              :style="{ background: card.bg }"
            >
              <span class="summary-card__icon">
                <component :is="card.icon" :size="20" :stroke-width="2.2" />
              </span>
              <div>
                <p class="summary-card__label">{{ card.label }}</p>
                <p class="summary-card__value">{{ card.value }}</p>
                <p class="summary-card__caption">{{ card.caption }}</p>
              </div>
            </article>
          </div>
        </section>

        <div class="desktop-content-grid">
          <div class="desktop-content-grid__main">
            <section class="soft-card section-card">
              <div class="section-head">
                <h2>کارهای امروز</h2>
                <RouterLink to="/tasks" class="section-link">مشاهده همه</RouterLink>
              </div>

              <div v-if="todayTasks.length" class="task-list">
                <article
                  v-for="task in todayTasks"
                  :key="`${task.name || task.title}-desktop`"
                  class="task-row task-row--desktop"
                >
                  <button
                    type="button"
                    class="task-row__check"
                    :class="{ 'task-row__check--done': isTaskDone(task) }"
                    @click="completeTaskItem(task)"
                  >
                    <Check v-if="isTaskDone(task)" :size="16" :stroke-width="2.5" />
                  </button>

                  <div class="task-row__body">
                    <div class="task-row__top">
                      <h3 :class="{ 'line-through text-[var(--color-text-tertiary)]': isTaskDone(task) }">
                        {{ task.title }}
                      </h3>
                      <span class="task-priority" :class="taskPriorityClass(task.priority)">{{ priorityLabelFor(task.priority) }}</span>
                    </div>
                    <p class="task-row__sub">{{ task.description || 'بدون توضیح اضافه' }}</p>
                  </div>

                  <div class="task-row__aside">
                    <span>{{ taskTime(task) }}</span>
                    <span>{{ taskStatusLabel(task.status) }}</span>
                  </div>
                </article>
              </div>

              <div v-else-if="isBusy" class="stack-skeleton">
                <div v-for="index in 4" :key="`task-skeleton-${index}`" class="skeleton-row" />
              </div>

              <div v-else class="empty-state empty-state--desktop">
                <p class="empty-state__title">امروز کارت سبک است</p>
                <p class="empty-state__caption">از سایدپنل یا منوی افزودن سریع، کارت بعدی را برای خودت روشن کن.</p>
              </div>
            </section>

            <section class="soft-card section-card">
              <div class="section-head">
                <h2>عادت‌های امروز</h2>
                <RouterLink to="/habits" class="section-link">همه عادت‌ها</RouterLink>
              </div>

              <div v-if="habitRows.length" class="habit-list habit-list--desktop">
                <article
                  v-for="habit in habitRows"
                  :key="`${habit.name}-desktop`"
                  class="habit-row"
                >
                  <button
                    type="button"
                    class="habit-row__toggle"
                    :class="{ 'habit-row__toggle--done': habit.done }"
                    @click="toggleHabit(habit)"
                  >
                    <CheckCheck v-if="habit.done" :size="16" :stroke-width="2.4" />
                    <CircleDashed v-else :size="16" :stroke-width="2.2" />
                  </button>

                  <div class="habit-row__body">
                    <div class="habit-row__top">
                      <h3>{{ habit.name }}</h3>
                      <span>{{ habit.valueLabel }}</span>
                    </div>
                    <div class="soft-progress">
                      <span :style="{ width: `${habit.percent}%`, background: habit.bar }" />
                    </div>
                  </div>
                </article>
              </div>

              <div v-else-if="isBusy" class="stack-skeleton">
                <div v-for="index in 4" :key="`habit-skeleton-${index}`" class="skeleton-row skeleton-row--short" />
              </div>

              <div v-else class="empty-state empty-state--desktop">
                <p class="empty-state__title">عادت فعالی پیدا نشد</p>
                <p class="empty-state__caption">اولین روتین روزانه را اضافه کن تا این بخش جان بگیرد.</p>
              </div>
            </section>
          </div>

          <div class="desktop-content-grid__side">
            <section class="soft-card section-card">
              <div class="section-head">
                <h2>وضعیت مالی</h2>
                <RouterLink to="/finance" class="section-link">جزئیات</RouterLink>
              </div>

              <div class="finance-card__numbers finance-card__numbers--stack">
                <div>
                  <p class="finance-card__label">خرج این ماه</p>
                  <p class="finance-card__amount">{{ financeMonthExpense }}</p>
                </div>
                <div>
                  <p class="finance-card__label">بودجه باقی‌مانده</p>
                  <p class="finance-card__amount finance-card__amount--muted">{{ financeRemainingBudget }}</p>
                </div>
              </div>

              <div class="soft-progress finance-card__progress">
                <span :style="{ width: `${financeProgress}%`, background: 'linear-gradient(90deg, #111111 0%, #3a352f 100%)' }" />
              </div>

              <div class="finance-card__payment">
                <p class="finance-card__label">پرداخت نزدیک</p>
                <template v-if="nextPayment">
                  <h3>{{ nextPayment.title }}</h3>
                  <p>{{ nextPaymentLabel }}</p>
                </template>
                <template v-else>
                  <p class="empty-inline">پرداخت پیش‌رویی در ۷ روز آینده ثبت نشده.</p>
                </template>
              </div>
            </section>

            <section class="soft-card section-card">
              <div class="section-head">
                <h2>هدف اصلی</h2>
                <RouterLink to="/goals" class="section-link">اهداف</RouterLink>
              </div>

              <template v-if="focusGoal">
                <div class="goal-card goal-card--stacked">
                  <div class="goal-ring" :style="goalRingStyle">
                    <div class="goal-ring__inner">
                      <span>{{ focusGoalPercent }}</span>
                    </div>
                  </div>

                  <div class="goal-card__body">
                    <h3>{{ focusGoal.title }}</h3>
                    <p>{{ focusGoal.next_milestone || 'گام بعدی را روشن کن.' }}</p>
                    <div class="goal-card__meta">
                      <span>{{ focusGoalDateLabel }}</span>
                      <span>{{ focusGoalPercent }}</span>
                    </div>
                  </div>
                </div>
              </template>

              <div v-else-if="isBusy" class="stack-skeleton">
                <div class="skeleton-row skeleton-row--tall" />
              </div>

              <div v-else class="empty-state empty-state--desktop">
                <p class="empty-state__title">فعلاً هدف فعالی نداری</p>
                <p class="empty-state__caption">یک هدف فعال بساز تا پیشرفت و موعد آن اینجا دیده شود.</p>
              </div>
            </section>

            <section class="soft-card section-card">
              <div class="section-head">
                <h2>یادآوری روز</h2>
                <Sparkles :size="18" :stroke-width="2.2" />
              </div>
              <p class="inspiration-card__text">{{ inspirationText }}</p>
              <p v-if="inspirationAuthor" class="inspiration-card__author">{{ inspirationAuthor }}</p>
            </section>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, markRaw, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  CircleDashed,
  Heart,
  Leaf,
  Scale,
  Sparkles,
  Target,
  WalletCards,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { useHabitsStore } from '@/stores/habits'
import { useTasksStore } from '@/stores/tasks'
import { PersianNumberFormatter, getPersianMonthName, getPersianWeekday, toPersianDigits } from '@/utils/jalali'

const ICONS = {
  bell: markRaw(Bell),
  calendar: markRaw(CalendarDays),
  check: markRaw(Check),
  checkCheck: markRaw(CheckCheck),
  chevronLeft: markRaw(ChevronLeft),
  circleDashed: markRaw(CircleDashed),
  heart: markRaw(Heart),
  leaf: markRaw(Leaf),
  scale: markRaw(Scale),
  sparkles: markRaw(Sparkles),
  target: markRaw(Target),
  walletCards: markRaw(WalletCards),
}

const router = useRouter()
const auth = useAuthStore()
const dashboard = useDashboardStore()
const tasks = useTasksStore()
const habits = useHabitsStore()

const integerFormatter = new PersianNumberFormatter('fa-IR', { maximumFractionDigits: 0 })
const decimalFormatter = new Intl.NumberFormat('fa-IR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const displayName = computed(() => {
  return auth.user?.display_name || auth.user?.full_name || auth.user?.name || auth.user?.email || 'دوست من'
})

const displayInitial = computed(() => {
  return firstText(displayName.value).charAt(0) || 'ه'
})

const firstName = computed(() => {
  return firstText(displayName.value) || 'دوست'
})

const greeting = computed(() => `سلام ${firstName.value}`)

const dateSource = computed(() => {
  return parseDate(dashboard.date) || new Date()
})

const fullDateLabel = computed(() => {
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateSource.value)
})

const isBusy = computed(() => dashboard.loading || tasks.loading || habits.loading)

const lifeScoreValue = computed(() => {
  const raw = Number(dashboard.lifeScore?.score || 0)
  if (Number.isNaN(raw)) return 0
  return Math.max(0, Math.min(100, raw))
})

const scoreDisplay = computed(() => decimalFormatter.format(lifeScoreValue.value / 10))

const scoreMessage = computed(() => {
  if (lifeScoreValue.value >= 85) return 'ریتم امروز خیلی خوب است؛ فقط آن را حفظ کن.'
  if (lifeScoreValue.value >= 70) return 'ریتم امروز خوب است؛ با چند حرکت کوچک بهتر هم می‌شود.'
  if (lifeScoreValue.value >= 50) return 'امروز به کمی نظم و تمرکز بیشتر نیاز داری.'
  return 'از یک قدم کوچک شروع کن؛ روز هنوز قابل جمع شدن است.'
})

const encouragement = computed(() => {
  if (lifeScoreValue.value >= 80) return 'عالیه؛ به راهت ادامه بده'
  if (lifeScoreValue.value >= 60) return 'فقط روی مهم‌ترین کار تمرکز کن'
  return 'با یک کار کوچک و روشن دوباره ریتم بگیر'
})

const scoreMetrics = computed(() => {
  const breakdown = dashboard.lifeScore?.breakdown || {}
  return [
    {
      label: 'بهره‌وری',
      value: `${integerFormatter.format(Number(breakdown.task || 0))}٪`,
      percent: clampPercent(breakdown.task),
      icon: ICONS.target,
      bg: 'rgba(244, 168, 211, 0.24)',
      bar: 'linear-gradient(90deg, #f3a3cf 0%, #ef8ec2 100%)',
    },
    {
      label: 'مالی',
      value: `${integerFormatter.format(Number(breakdown.finance || 0))}٪`,
      percent: clampPercent(breakdown.finance),
      icon: ICONS.walletCards,
      bg: 'rgba(247, 217, 87, 0.28)',
      bar: 'linear-gradient(90deg, #f7de72 0%, #efc84b 100%)',
    },
    {
      label: 'سلامت',
      value: `${integerFormatter.format(Number(breakdown.health || breakdown.habit || 0))}٪`,
      percent: clampPercent(breakdown.health || breakdown.habit),
      icon: ICONS.leaf,
      bg: 'rgba(184, 201, 122, 0.25)',
      bar: 'linear-gradient(90deg, #b9cf7a 0%, #9fb65f 100%)',
    },
    {
      label: 'تعادل',
      value: `${integerFormatter.format(Number(breakdown.balance || breakdown.mood || 0))}٪`,
      percent: clampPercent(breakdown.balance || breakdown.mood),
      icon: ICONS.heart,
      bg: 'rgba(175, 199, 235, 0.28)',
      bar: 'linear-gradient(90deg, #b8cff0 0%, #98b7e3 100%)',
    },
  ]
})

const summaryCards = computed(() => {
  const metrics = dashboard.summaryMetrics?.length ? dashboard.summaryMetrics : buildFallbackSummary()
  const cards = {
    tasks: {
      icon: ICONS.target,
      bg: 'linear-gradient(180deg, rgba(255, 234, 214, 0.96) 0%, rgba(255, 246, 238, 0.96) 100%)',
      caption: todayTasks.value.length ? `${toPersianDigits(todayTasks.value.length)} مورد مهم` : 'روز خلوت',
    },
    habits: {
      icon: ICONS.checkCheck,
      bg: 'linear-gradient(180deg, rgba(237, 222, 255, 0.96) 0%, rgba(249, 243, 255, 0.96) 100%)',
      caption: habitRows.value.some((item) => item.done) ? 'چند مورد انجام شده' : 'هنوز شروع نشده',
    },
    budget: {
      icon: ICONS.walletCards,
      bg: 'linear-gradient(180deg, rgba(223, 239, 187, 0.96) 0%, rgba(247, 251, 233, 0.96) 100%)',
      caption: 'باقی‌مانده ماه',
    },
    water_sleep: {
      icon: ICONS.heart,
      bg: 'linear-gradient(180deg, rgba(214, 229, 255, 0.96) 0%, rgba(243, 248, 255, 0.96) 100%)',
      caption: waterSleepCaption.value,
    },
    next_plan: {
      icon: ICONS.calendar,
      bg: 'linear-gradient(180deg, rgba(255, 233, 208, 0.96) 0%, rgba(255, 248, 238, 0.96) 100%)',
      caption: agendaItems.value.length ? eventTypeLabel(agendaItems.value[0]?.event_type) : 'هنوز برنامه‌ای نیست',
    },
  }

  return metrics.slice(0, 5).map((metric) => {
    const preset = cards[metric.key] || cards.tasks
    return {
      ...preset,
      label: metric.label,
      value: formatSummaryMetric(metric.value, metric.suffix),
    }
  })
})

const priorityItem = computed(() => dashboard.priorityItem || null)
const priorityTitle = computed(() => priorityItem.value?.title || 'یک کار کوچک اما مهم برای خودت انتخاب کن')
const prioritySubtitle = computed(() => {
  return priorityItem.value?.subtitle || 'وقتی مهم‌ترین مورد روشن باشد، بقیه‌ی روز هم ساده‌تر جمع می‌شود.'
})
const priorityTime = computed(() => {
  if (!priorityItem.value) return 'بدون زمان'
  return formatTimeRange(priorityItem.value.starts_at, priorityItem.value.ends_at)
})
const priorityLabel = computed(() => priorityLabelFor(priorityItem.value?.priority))
const priorityPillClass = computed(() => taskPriorityClass(priorityItem.value?.priority))
const priorityTypeLabel = computed(() => {
  const type = priorityItem.value?.type
  if (type === 'event') return 'رویداد'
  if (type === 'goal') return 'هدف'
  return 'کار'
})
const priorityAttendees = computed(() => {
  return Array.isArray(priorityItem.value?.attendees) ? priorityItem.value.attendees : []
})

const todayTasks = computed(() => {
  const pool = tasks.tasks?.length ? tasks.tasks : dashboard.highlights?.tasks_due || []
  return [...pool]
    .filter(Boolean)
    .sort((left, right) => taskPriorityRank(left.priority) - taskPriorityRank(right.priority) || parseDate(left.due_date) - parseDate(right.due_date))
    .slice(0, 4)
})

const todayLogMap = computed(() => {
  const map = new Map()
  for (const log of habits.logs || []) {
    if (log?.habit) map.set(log.habit, log)
  }
  return map
})

const habitRows = computed(() => {
  return (habits.habits || [])
    .filter((habit) => habit?.is_active !== 0)
    .slice(0, 5)
    .map((habit, index) => {
      const log = todayLogMap.value.get(habit.name)
      const targetValue = Number(habit.target_value || 1)
      const currentValue = Number(log?.value || (log?.status === 'done' ? targetValue : 0))
      const done = log?.status === 'done' || currentValue >= targetValue
      const percent = clampPercent(targetValue ? (currentValue / targetValue) * 100 : done ? 100 : 0)
      const tone = habitTone(index)
      return {
        name: habit.name,
        unit: habit.unit || 'بار',
        targetValue,
        currentValue,
        done,
        percent,
        bar: tone.bar,
        valueLabel: done && targetValue <= 1
          ? 'کامل شد'
          : `${toPersianDigits(Math.min(currentValue, targetValue))}/${toPersianDigits(targetValue)} ${habit.unit || 'بار'}`,
      }
    })
})

const waterSleepCaption = computed(() => {
  const water = dashboard.highlights?.water_status
  if (water?.consumed_ml) {
    return `${toPersianDigits(Math.round(Number(water.consumed_ml) / 250))} لیوان آب امروز`
  }
  return 'امروز هنوز ثبت نشده'
})

const agendaItems = computed(() => {
  return (dashboard.agenda || []).slice(0, 2)
})

const focusGoal = computed(() => dashboard.focusGoal || null)
const focusGoalPercent = computed(() => {
  return `${integerFormatter.format(Number(focusGoal.value?.progress_percent || 0))}٪`
})
const focusGoalDateLabel = computed(() => {
  if (!focusGoal.value?.target_date) return 'بدون موعد'
  return `موعد ${formatDateShort(focusGoal.value.target_date)}`
})
const goalRingStyle = computed(() => {
  const percent = clampPercent(focusGoal.value?.progress_percent || 0)
  return {
    background: `conic-gradient(#f2bb43 0 ${percent}%, rgba(255, 255, 255, 0.86) ${percent}% 100%)`,
  }
})

const financeSnapshot = computed(() => {
  return dashboard.financeSnapshot || {}
})
const financeMonthExpense = computed(() => {
  return formatCurrency(financeSnapshot.value?.month_expense || dashboard.financeSummary?.month_expense || 0)
})
const financeRemainingBudget = computed(() => {
  return formatCurrency(financeSnapshot.value?.remaining_budget || 0)
})
const financeProgress = computed(() => {
  const expense = Number(financeSnapshot.value?.month_expense || dashboard.financeSummary?.month_expense || 0)
  const remaining = Number(financeSnapshot.value?.remaining_budget || 0)
  const total = expense + remaining
  if (!total) return 0
  return clampPercent((expense / total) * 100)
})
const nextPayment = computed(() => financeSnapshot.value?.next_payment || null)
const nextPaymentLabel = computed(() => {
  if (!nextPayment.value) return ''
  const amount = nextPayment.value.amount ? formatCurrency(nextPayment.value.amount) : ''
  const due = nextPayment.value.due_date ? formatDateShort(nextPayment.value.due_date) : ''
  return [amount, due].filter(Boolean).join(' - ')
})

const inspirationText = computed(() => {
  return dashboard.highlights?.inspiration?.text || 'به ریتمی وفادار بمان که به زندگی‌ات آرامش و وضوح می‌دهد.'
})

const inspirationAuthor = computed(() => {
  return dashboard.highlights?.inspiration?.author || ''
})

function parseDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function clampPercent(value) {
  const number = Number(value || 0)
  if (Number.isNaN(number)) return 0
  return Math.max(0, Math.min(100, Math.round(number)))
}

function firstText(value) {
  return String(value || '').trim().split(/\s+/)[0] || ''
}

function formatSummaryMetric(value, suffix = '') {
  if (typeof value === 'number') {
    return `${integerFormatter.format(value)}${suffix ? ` ${suffix}` : ''}`.trim()
  }
  return `${toPersianDigits(String(value || 0))}${suffix ? ` ${suffix}` : ''}`.trim()
}

function buildFallbackSummary() {
  const remaining = financeSnapshot.value?.remaining_budget
  const budgetText = remaining ? compactMoney(remaining) : '۰'
  const agendaText = agendaItems.value.length ? formatTime(parseDate(agendaItems.value[0].starts_at)) : 'آزاد'
  return [
    { key: 'tasks', label: 'کارهای امروز', value: todayTasks.value.length, suffix: '' },
    { key: 'habits', label: 'عادت‌ها', value: habitRows.value.filter((item) => item.done).length, suffix: 'کامل شده' },
    { key: 'budget', label: 'بودجه', value: budgetText, suffix: '' },
    { key: 'water_sleep', label: 'آب و خواب', value: waterSleepCaption.value.replace(' لیوان آب امروز', ''), suffix: 'لیوان' },
    { key: 'next_plan', label: 'برنامه بعدی', value: agendaText, suffix: '' },
  ]
}

function formatCurrency(value) {
  return `${integerFormatter.format(Number(value || 0))} تومان`
}

function compactMoney(value) {
  const number = Number(value || 0)
  if (number >= 1000000) {
    return `${decimalFormatter.format(number / 1000000)} م`
  }
  if (number >= 1000) {
    return `${integerFormatter.format(Math.round(number / 1000))} ه`
  }
  return integerFormatter.format(number)
}

function formatTime(dateLike) {
  const date = parseDate(dateLike)
  if (!date) return 'بدون زمان'
  return toPersianDigits(
    date.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  )
}

function formatTimeRange(start, end) {
  const startLabel = formatTime(start)
  const endLabel = parseDate(end) ? formatTime(end) : ''
  return endLabel ? `${startLabel} تا ${endLabel}` : startLabel
}

function formatDateShort(dateLike) {
  const date = parseDate(dateLike)
  if (!date) return 'نامشخص'
  const day = toPersianDigits(date.getDate())
  const month = getPersianMonthName(date)
  return `${day} ${month}`
}

function openPriority() {
  if (priorityItem.value?.type === 'event') {
    router.push('/calendar')
    return
  }
  if (priorityItem.value?.type === 'goal') {
    router.push('/goals')
    return
  }
  router.push('/tasks')
}

function attendeeInitial(attendee) {
  return firstText(attendee?.name || attendee?.email || 'ه').charAt(0)
}

function taskPriorityRank(priority) {
  const order = { urgent: 0, high: 1, medium: 2, low: 3 }
  return order[priority] ?? 4
}

function isTaskDone(task) {
  return ['done', 'completed'].includes(String(task?.status || '').toLowerCase())
}

function taskTime(task) {
  if (task?.due_date) return formatTime(task.due_date)
  if (task?.starts_at) return formatTime(task.starts_at)
  return 'بدون زمان'
}

function taskStatusLabel(status) {
  const map = {
    todo: 'برای انجام',
    in_progress: 'در حال انجام',
    done: 'انجام شده',
    completed: 'انجام شده',
  }
  return map[status] || 'عادی'
}

function priorityLabelFor(priority) {
  const map = {
    urgent: 'فوری',
    high: 'تمرکز بالا',
    medium: 'عادی',
    low: 'سبک',
  }
  return map[priority] || 'عادی'
}

function taskPriorityClass(priority) {
  if (priority === 'urgent') return 'task-priority--urgent'
  if (priority === 'high') return 'task-priority--high'
  if (priority === 'low') return 'task-priority--low'
  return 'task-priority--medium'
}

async function completeTaskItem(task) {
  if (!task?.name || isTaskDone(task)) return
  try {
    await tasks.completeTask(task.name)
  } catch {
    // Keep the dashboard usable even if the request fails.
  }
}

function habitTone(index) {
  const tones = [
    { bar: 'linear-gradient(90deg, #b7caf4 0%, #96b0ec 100%)' },
    { bar: 'linear-gradient(90deg, #bad784 0%, #98bb57 100%)' },
    { bar: 'linear-gradient(90deg, #f6d56f 0%, #efc34b 100%)' },
    { bar: 'linear-gradient(90deg, #efb4d5 0%, #e78dbd 100%)' },
    { bar: 'linear-gradient(90deg, #b6e0d3 0%, #88c8b3 100%)' },
  ]
  return tones[index % tones.length]
}

async function toggleHabit(habit) {
  if (!habit?.name || habit.done) return
  try {
    await habits.logHabit(habit.name, 'done', habit.targetValue || 1)
  } catch {
    // Ignore transient API failures on quick toggle.
  }
}

function agendaTime(item) {
  return formatTimeRange(item?.starts_at, item?.ends_at)
}

function eventTypeLabel(type) {
  const map = {
    meeting: 'جلسه',
    work: 'کار',
    personal: 'شخصی',
    health: 'سلامت',
  }
  return map[type] || 'برنامه'
}

function agendaBackground(item) {
  const map = {
    meeting: 'linear-gradient(180deg, rgba(231, 217, 248, 0.92) 0%, rgba(246, 239, 255, 0.92) 100%)',
    work: 'linear-gradient(180deg, rgba(214, 238, 227, 0.92) 0%, rgba(242, 251, 246, 0.92) 100%)',
    personal: 'linear-gradient(180deg, rgba(255, 232, 212, 0.92) 0%, rgba(255, 247, 239, 0.92) 100%)',
    health: 'linear-gradient(180deg, rgba(216, 229, 255, 0.92) 0%, rgba(244, 248, 255, 0.92) 100%)',
  }
  return map[item?.event_type] || 'linear-gradient(180deg, rgba(248, 240, 230, 0.96) 0%, rgba(255, 255, 255, 0.96) 100%)'
}

onMounted(() => {
  dashboard.fetchDashboard()
  tasks.fetchTasks()
  habits.fetchHabits()
})
</script>

<style scoped>
.home-view {
  position: relative;
  overflow: hidden;
  color: var(--color-text);
}

.home-view__backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at top right, rgba(255, 221, 190, 0.52) 0, rgba(255, 221, 190, 0) 28%),
    radial-gradient(circle at top left, rgba(205, 184, 240, 0.16) 0, rgba(205, 184, 240, 0) 24%),
    linear-gradient(180deg, #fbf6ee 0%, #f6efe3 100%);
}

.home-view__container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 16px 16px 112px;
}

.home-mobile,
.home-desktop {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mobile-header,
.desktop-header__main,
.section-head,
.score-card__content,
.priority-card__header,
.priority-card__footer,
.goal-card,
.desktop-grid,
.desktop-content-grid {
  display: flex;
}

.mobile-header {
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: max(6px, env(safe-area-inset-top));
}

.mobile-header__brand {
  flex: 1;
  text-align: center;
}

.mobile-header__date,
.desktop-header__eyebrow {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.mobile-header__title {
  margin-top: 4px;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.mobile-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mobile-user__copy {
  min-width: 0;
  text-align: left;
}

.mobile-user__greeting {
  font-size: 0.9rem;
  font-weight: 700;
}

.mobile-user__name {
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.mobile-user__avatar,
.attendee {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
}

.mobile-user__avatar {
  width: 46px;
  height: 46px;
  background: linear-gradient(180deg, #1a1a1a 0%, #111111 100%);
  color: var(--color-text-on-dark);
  font-weight: 800;
}

.icon-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(17, 17, 17, 0.06);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: var(--shadow-sm);
}

.icon-button--desktop {
  background: rgba(255, 255, 255, 0.82);
}

.icon-button__dot {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #ff8456;
  box-shadow: 0 0 0 4px rgba(255, 132, 86, 0.14);
}

.soft-card,
.score-card,
.priority-card,
.inspiration-card {
  border: 1px solid rgba(17, 17, 17, 0.05);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 18px 42px rgba(79, 62, 40, 0.08);
  backdrop-filter: blur(12px);
}

.score-card,
.priority-card,
.inspiration-card,
.section-card {
  padding: 18px;
}

.section-card {
  gap: 16px;
}

.score-card {
  background:
    radial-gradient(circle at top left, rgba(255, 240, 218, 0.9) 0, rgba(255, 240, 218, 0) 34%),
    rgba(255, 255, 255, 0.84);
}

.score-card__content {
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.section-eyebrow {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text);
}

.score-card__value,
.desktop-score__value {
  margin-top: 6px;
  font-family: var(--font-family-numeric);
  font-size: clamp(3.7rem, 11vw, 5.5rem);
  line-height: 0.92;
  font-weight: 900;
  letter-spacing: -0.06em;
}

.score-card__message,
.desktop-score__message {
  margin-top: 8px;
  font-size: 0.94rem;
  line-height: 1.8;
  color: var(--color-text-secondary);
}

.score-card__encouragement {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  border-radius: 999px;
  background: rgba(255, 239, 216, 0.8);
  padding: 8px 12px;
  font-size: 0.86rem;
  color: #7b563d;
}

.score-orbit {
  position: relative;
  width: 164px;
  height: 164px;
  flex-shrink: 0;
}

.score-orbit--desktop {
  width: 296px;
  height: 296px;
}

.score-orbit__segment {
  position: absolute;
  border-radius: 999px;
}

.score-orbit__segment--pink {
  top: 8px;
  right: 22px;
  width: 86px;
  height: 22px;
  background: #f2abd0;
  transform: rotate(-24deg);
}

.score-orbit__segment--yellow {
  top: 18px;
  left: 20px;
  width: 76px;
  height: 24px;
  background: #f7d75f;
  transform: rotate(38deg);
}

.score-orbit__segment--green {
  bottom: 16px;
  right: 18px;
  width: 74px;
  height: 24px;
  background: #b6cb73;
  transform: rotate(62deg);
}

.score-orbit__segment--blue {
  bottom: 18px;
  left: 18px;
  width: 82px;
  height: 24px;
  background: #a9c4ee;
  transform: rotate(-32deg);
}

.score-orbit--desktop .score-orbit__segment--pink {
  top: 18px;
  right: 36px;
  width: 154px;
  height: 34px;
}

.score-orbit--desktop .score-orbit__segment--yellow {
  top: 36px;
  left: 36px;
  width: 136px;
  height: 34px;
}

.score-orbit--desktop .score-orbit__segment--green {
  right: 30px;
  bottom: 32px;
  width: 134px;
  height: 34px;
}

.score-orbit--desktop .score-orbit__segment--blue {
  bottom: 34px;
  left: 28px;
  width: 142px;
  height: 34px;
}

.score-orbit__core {
  position: absolute;
  inset: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at top, rgba(255, 255, 255, 0.96) 0%, rgba(252, 248, 241, 0.96) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 18px 34px rgba(126, 95, 65, 0.12);
}

.score-orbit--desktop .score-orbit__core {
  inset: 56px;
}

.score-orbit__flower {
  color: #ef9b7e;
  font-size: 2rem;
}

.score-orbit__center-value {
  font-family: var(--font-family-numeric);
  font-size: 4rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.06em;
}

.score-orbit__center-label {
  margin-top: 6px;
  text-align: center;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.score-orbit__badge {
  position: absolute;
  display: flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: #343434;
  box-shadow: 0 10px 20px rgba(72, 55, 38, 0.12);
}

.score-orbit--desktop .score-orbit__badge {
  width: 56px;
  height: 56px;
}

.score-orbit__badge--top-right {
  top: 24px;
  right: 0;
}

.score-orbit__badge--right {
  right: 4px;
  bottom: 54px;
}

.score-orbit__badge--bottom-left {
  bottom: 12px;
  left: 12px;
}

.score-orbit__badge--left {
  top: 52px;
  left: 4px;
}

.score-orbit--desktop .score-orbit__badge--top-right {
  top: 44px;
  right: 8px;
}

.score-orbit--desktop .score-orbit__badge--right {
  right: 12px;
  bottom: 78px;
}

.score-orbit--desktop .score-orbit__badge--bottom-left {
  bottom: 28px;
  left: 28px;
}

.score-orbit--desktop .score-orbit__badge--left {
  top: 78px;
  left: 6px;
}

.score-metrics,
.summary-grid,
.task-list,
.habit-list,
.agenda-list {
  display: grid;
  gap: 12px;
}

.score-metrics {
  margin-top: 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.score-metric {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.74);
  padding: 12px;
}

.score-metric__head,
.desktop-score__metric-head,
.habit-row__top,
.task-row__top,
.task-row__meta,
.goal-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.score-metric__icon,
.summary-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  color: #1f1f1f;
}

.score-metric__label,
.summary-card__label,
.finance-card__label {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.score-metric__value,
.summary-card__value,
.finance-card__amount {
  margin-top: 2px;
  font-family: var(--font-family-numeric);
  font-size: 1.14rem;
  font-weight: 800;
}

.soft-progress {
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: rgba(17, 17, 17, 0.07);
}

.soft-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width var(--duration-normal) var(--easing-default);
}

.section-head {
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.section-head h2 {
  font-size: 1.18rem;
  font-weight: 800;
}

.section-link,
.section-tag {
  font-size: 0.86rem;
  color: #d27954;
}

.summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border-radius: 24px;
  padding: 14px;
}

.summary-card__caption {
  margin-top: 4px;
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.priority-card {
  background: linear-gradient(180deg, rgba(255, 156, 116, 0.94) 0%, rgba(247, 135, 103, 0.92) 100%);
  color: #2d190f;
}

.priority-card__title {
  margin-top: 6px;
  font-size: clamp(1.8rem, 7vw, 2.8rem);
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.priority-card__subtitle {
  margin-top: 8px;
  max-width: 36rem;
  font-size: 0.95rem;
  color: rgba(45, 25, 15, 0.82);
}

.priority-card__bookmark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.38);
}

.priority-card__meta,
.attendees {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.priority-card__meta {
  margin-top: 16px;
}

.priority-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  border-radius: 999px;
  padding: 0 12px;
  font-size: 0.84rem;
  font-weight: 700;
}

.priority-pill--ghost {
  background: rgba(255, 255, 255, 0.34);
}

.task-priority--urgent {
  background: rgba(44, 16, 16, 0.12);
  color: #4b1f1f;
}

.task-priority--high {
  background: rgba(255, 248, 223, 0.66);
  color: #755324;
}

.task-priority--medium {
  background: rgba(255, 255, 255, 0.34);
  color: #3b352f;
}

.task-priority--low {
  background: rgba(255, 255, 255, 0.48);
  color: #6b665d;
}

.priority-card__footer {
  margin-top: 18px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.attendee {
  width: 44px;
  height: 44px;
  margin-inline-start: -6px;
  border: 2px solid rgba(255, 255, 255, 0.68);
  background: rgba(255, 246, 240, 0.92);
  font-weight: 800;
}

.attendee:first-child {
  margin-inline-start: 0;
}

.attendee--count {
  background: rgba(255, 255, 255, 0.3);
}

.priority-card__solo {
  font-size: 0.9rem;
  font-weight: 700;
}

.cta-button,
.soft-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  border-radius: 999px;
  padding: 0 16px;
  font-weight: 700;
  transition:
    transform var(--duration-fast) var(--easing-default),
    box-shadow var(--duration-fast) var(--easing-default);
}

.cta-button:active,
.soft-pill:active {
  transform: scale(0.98);
}

.cta-button--dark,
.soft-pill--dark {
  background: #181513;
  color: var(--color-text-on-dark);
  box-shadow: 0 12px 22px rgba(25, 22, 19, 0.18);
}

.soft-pill {
  background: rgba(255, 255, 255, 0.74);
  color: var(--color-text);
}

.mobile-split {
  display: grid;
  gap: 16px;
}

.task-row,
.habit-row,
.agenda-item,
.desktop-priority__agenda-item {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 22px;
}

.task-row {
  padding: 12px;
  background: rgba(247, 244, 239, 0.82);
}

.task-row__check,
.habit-row__toggle {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  border: 1px solid rgba(17, 17, 17, 0.08);
  background: rgba(255, 255, 255, 0.8);
  color: var(--color-text-secondary);
}

.task-row__check--done,
.habit-row__toggle--done {
  background: #171513;
  color: var(--color-text-on-dark);
}

.task-row__body,
.habit-row__body,
.goal-card__body {
  flex: 1;
  min-width: 0;
}

.task-row__top h3,
.habit-row__top h3,
.finance-card__payment h3,
.goal-card__body h3,
.agenda-item h3 {
  font-size: 1rem;
  font-weight: 800;
}

.task-priority {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.74rem;
  font-weight: 700;
}

.task-row__sub,
.empty-state__caption,
.agenda-item__type,
.goal-card__body p,
.desktop-header__subtitle,
.empty-inline {
  color: var(--color-text-secondary);
  line-height: 1.75;
}

.task-row__meta {
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.finance-card__numbers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.finance-card__numbers--stack {
  grid-template-columns: 1fr;
}

.finance-card__amount--muted {
  color: #3a352f;
}

.finance-card__progress {
  margin-top: 16px;
}

.finance-card__payment {
  margin-top: 18px;
}

.habit-list {
  gap: 10px;
}

.habit-row {
  padding: 10px 12px;
  background: rgba(249, 246, 240, 0.88);
}

.habit-row__top {
  margin-bottom: 8px;
  font-size: 0.84rem;
}

.agenda-item {
  justify-content: space-between;
  padding: 14px;
}

.agenda-item__time {
  margin-bottom: 6px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.goal-card {
  align-items: center;
  gap: 16px;
}

.goal-card--stacked {
  flex-direction: column;
  align-items: flex-start;
}

.goal-ring {
  display: flex;
  width: 104px;
  height: 104px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 8px;
}

.goal-ring__inner {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  background: rgba(255, 255, 255, 0.88);
  font-family: var(--font-family-numeric);
  font-size: 1.2rem;
  font-weight: 800;
}

.goal-card__meta {
  margin-top: 12px;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.inspiration-card {
  background:
    linear-gradient(180deg, rgba(255, 242, 222, 0.92) 0%, rgba(255, 247, 237, 0.92) 100%),
    rgba(255, 255, 255, 0.72);
}

.inspiration-card__text {
  margin-top: 12px;
  font-size: 1rem;
  line-height: 2;
}

.inspiration-card__author {
  margin-top: 10px;
  font-size: 0.84rem;
  color: var(--color-text-secondary);
}

.empty-state {
  border-radius: 22px;
  background: rgba(248, 244, 238, 0.86);
  padding: 18px;
}

.empty-state__title {
  font-weight: 800;
}

.stack-skeleton {
  display: grid;
  gap: 10px;
}

.skeleton-row {
  height: 74px;
  border-radius: 20px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.52) 0%, rgba(245, 240, 231, 0.96) 50%, rgba(255, 255, 255, 0.52) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.skeleton-row--short {
  height: 60px;
}

.skeleton-row--tall {
  height: 180px;
}

.desktop-header {
  margin-bottom: 6px;
}

.desktop-header__main {
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.desktop-header__title {
  margin-top: 8px;
  font-size: clamp(2.6rem, 3vw, 3.2rem);
  font-weight: 900;
  letter-spacing: -0.04em;
}

.desktop-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.desktop-grid {
  gap: 18px;
  align-items: stretch;
}

.desktop-score {
  flex: 1.35;
  padding: 26px;
}

.desktop-priority {
  flex: 1;
}

.desktop-score,
.desktop-score__copy,
.desktop-score__visual,
.desktop-content-grid__main,
.desktop-content-grid__side,
.desktop-priority__agenda {
  display: flex;
  flex-direction: column;
}

.desktop-score {
  flex-direction: row;
  justify-content: space-between;
  gap: 18px;
}

.desktop-score__copy {
  flex: 1;
}

.desktop-score__caption {
  margin-top: 10px;
  font-size: 0.92rem;
  color: #7c5d44;
}

.desktop-score__metrics {
  display: grid;
  gap: 12px;
  margin-top: 22px;
}

.desktop-score__metric {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
  padding: 12px;
}

.desktop-score__metric-head p {
  flex: 1;
  font-weight: 700;
}

.desktop-score__visual {
  align-items: center;
  justify-content: center;
}

.desktop-priority__agenda {
  gap: 10px;
  margin-top: 26px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.24);
  padding: 14px;
}

.desktop-priority__agenda-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.desktop-priority__agenda-item {
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.22);
}

.desktop-priority__agenda-item p {
  font-weight: 700;
}

.desktop-priority__agenda-item span {
  font-size: 0.8rem;
  color: rgba(45, 25, 15, 0.7);
}

.desktop-priority__agenda-item strong {
  font-family: var(--font-family-numeric);
}

.desktop-summary__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.summary-card--desktop {
  min-height: 124px;
}

.desktop-content-grid {
  gap: 18px;
  align-items: flex-start;
}

.desktop-content-grid__main {
  flex: 1.25;
  gap: 18px;
}

.desktop-content-grid__side {
  width: min(360px, 100%);
  gap: 18px;
}

.task-row--desktop {
  align-items: center;
}

.task-row__aside {
  display: flex;
  min-width: 108px;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.habit-list--desktop {
  gap: 12px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 1023px) {
  .home-view__container {
    max-width: 860px;
  }
}

@media (min-width: 768px) {
  .mobile-split {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .home-view__container {
    padding: 28px 28px 40px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .soft-progress span,
  .cta-button,
  .soft-pill,
  .skeleton-row {
    animation: none !important;
    transition: none !important;
  }
}
</style>
