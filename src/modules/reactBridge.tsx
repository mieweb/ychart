/**
 * Lightweight DOM bridge for controls used by YChart.
 *
 * Keep this file free of global stylesheet imports. YChart is embedded into
 * host applications, so importing a UI framework stylesheet here would apply
 * resets and utility classes outside the chart container.
 */

export interface SelectOption {
  label: string;
  value: string;
}

export interface RenderSelectConfig {
  options: SelectOption[];
  value?: string;
  placeholder?: string;
  label?: string;
  hideLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  searchable?: boolean;
}

export interface RenderButtonConfig {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  icon?: string;
  className?: string;
  fullWidth?: boolean;
}

export interface RenderBadgeConfig {
  text: string;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onRemove?: () => void;
  ariaLabel?: string;
}

export interface RenderAlertConfig {
  title?: string;
  message: string;
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger';
  dismissible?: boolean;
  onDismiss?: () => void;
}

export interface RenderInputConfig {
  value?: string;
  placeholder?: string;
  label?: string;
  hideLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  className?: string;
}

export interface RenderTooltipButtonConfig {
  icon: string;
  tooltip: string;
  onClick?: () => void;
  isActive?: boolean;
  activeColor?: string;
  ariaLabel?: string;
  badge?: string;
}

export interface RenderCheckboxItemConfig {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

export interface ToolbarButtonConfig {
  id: string;
  icon: string;
  tooltip: string;
  onClick: () => void;
  isActive?: boolean;
  activeColor?: string;
  badge?: string;
}

const renderedContainers = new Set<HTMLElement>();

function resetContainer(container: HTMLElement): void {
  container.innerHTML = '';
  renderedContainers.add(container);
}

function sizeStyles(size: 'sm' | 'md' | 'lg' = 'sm'): string {
  const sizes = {
    sm: 'height:28px;font-size:var(--yc-font-size-sm);padding:0 var(--yc-spacing-md);',
    md: 'height:34px;font-size:var(--yc-font-size-md);padding:0 var(--yc-spacing-lg);',
    lg: 'height:40px;font-size:var(--yc-font-size-lg);padding:0 var(--yc-spacing-xl);',
  };
  return sizes[size];
}

function createBadge(config: RenderBadgeConfig): HTMLElement {
  const badge = document.createElement('span');
  badge.setAttribute('aria-label', config.ariaLabel ?? config.text);
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: var(--yc-spacing-xs);
    max-width: 100%;
    border-radius: var(--yc-border-radius-pill);
    background: ${config.variant === 'danger' ? 'var(--yc-color-error-red-bg)' : 'var(--yc-color-button-bg)'};
    color: var(--yc-color-text-secondary);
    padding: var(--yc-spacing-xxs) var(--yc-spacing-sm);
    font-size: var(--yc-font-size-sm);
  `;

  const text = document.createElement('span');
  text.textContent = config.text;
  text.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  badge.appendChild(text);

  if (config.onRemove) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'x';
    removeBtn.setAttribute('aria-label', `Remove ${config.text}`);
    removeBtn.style.cssText = 'border:none;background:transparent;color:inherit;cursor:pointer;padding:0;';
    removeBtn.addEventListener('click', event => {
      event.stopPropagation();
      config.onRemove?.();
    });
    badge.appendChild(removeBtn);
  }

  return badge;
}

export function renderSelect(container: HTMLElement, config: RenderSelectConfig): void {
  resetContainer(container);

  const wrapper = document.createElement('label');
  wrapper.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--yc-spacing-xs);
    width: 100%;
  `;

  if (config.label && !config.hideLabel) {
    const labelText = document.createElement('span');
    labelText.textContent = config.label;
    labelText.style.cssText = `
      color: var(--yc-color-text-secondary);
      font-size: var(--yc-font-size-sm);
      font-weight: var(--yc-font-weight-medium);
    `;
    wrapper.appendChild(labelText);
  }

  const select = document.createElement('select');
  if (config.className) select.className = config.className;
  select.disabled = config.disabled ?? false;
  select.setAttribute('aria-label', config.ariaLabel ?? config.label ?? config.placeholder ?? 'Select option');
  select.style.cssText = `
    width: 100%;
    min-width: 0;
    border: var(--yc-border-width-thin) solid var(--yc-color-button-border);
    border-radius: var(--yc-border-radius-md);
    background: var(--yc-color-button-bg);
    color: var(--yc-color-text-secondary);
    cursor: pointer;
    outline: none;
    font-family: var(--yc-font-family-base);
    ${sizeStyles(config.size)}
  `;

  if (config.placeholder) {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = config.placeholder;
    placeholderOption.disabled = config.options.length > 0;
    select.appendChild(placeholderOption);
  }

  config.options.forEach(optionConfig => {
    const option = document.createElement('option');
    option.value = optionConfig.value;
    option.textContent = optionConfig.label;
    select.appendChild(option);
  });

  select.value = config.value ?? '';
  select.addEventListener('change', () => config.onValueChange?.(select.value));
  select.addEventListener('focus', () => {
    select.style.borderColor = 'var(--yc-color-primary)';
    select.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.15)';
  });
  select.addEventListener('blur', () => {
    select.style.borderColor = 'var(--yc-color-button-border)';
    select.style.boxShadow = 'none';
  });

  wrapper.appendChild(select);
  container.appendChild(wrapper);
}

/** Clear a rendered control from a container. */
export function unmountReactRoot(container: HTMLElement): void {
  container.innerHTML = '';
  renderedContainers.delete(container);
}

/** Clear all tracked rendered controls. */
export function unmountAllReactRoots(): void {
  renderedContainers.forEach(container => {
    container.innerHTML = '';
  });
  renderedContainers.clear();
}

export function renderButton(container: HTMLElement, config: RenderButtonConfig): void {
  resetContainer(container);

  const button = document.createElement('button');
  button.type = 'button';
  button.disabled = config.disabled ?? false;
  button.setAttribute('aria-label', config.ariaLabel ?? config.label);
  if (config.className) button.className = config.className;
  button.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--yc-spacing-xs);
    width: ${config.fullWidth ? '100%' : 'auto'};
    border: none;
    border-radius: var(--yc-border-radius-md);
    background: ${config.variant === 'danger' ? 'var(--yc-color-error-red)' : 'var(--yc-color-primary)'};
    color: white;
    cursor: pointer;
    font-family: var(--yc-font-family-base);
    ${sizeStyles(config.size === 'icon' ? 'sm' : config.size ?? 'sm')}
  `;

  if (config.icon) {
    const icon = document.createElement('span');
    icon.innerHTML = config.icon;
    icon.style.cssText = 'display:flex;align-items:center;';
    button.appendChild(icon);
  }

  const text = document.createElement('span');
  text.textContent = config.label;
  button.appendChild(text);
  button.addEventListener('click', () => config.onClick?.());
  container.appendChild(button);
}

export function renderBadge(container: HTMLElement, config: RenderBadgeConfig): void {
  resetContainer(container);
  container.appendChild(createBadge(config));
}

/** Render a list of badges into a container. */
export function renderBadgeList(
  container: HTMLElement,
  badges: RenderBadgeConfig[],
  clearAll?: { label: string; onClick: () => void },
): void {
  resetContainer(container);
  container.style.display = 'flex';
  container.style.gap = 'var(--yc-spacing-xs)';
  badges.forEach(badge => container.appendChild(createBadge(badge)));

  if (clearAll && badges.length > 0) {
    const clearContainer = document.createElement('span');
    container.appendChild(clearContainer);
    renderButton(clearContainer, {
      label: 'Clear',
      variant: 'danger',
      size: 'sm',
      ariaLabel: clearAll.label,
      onClick: clearAll.onClick,
    });
  }
}

export function renderAlert(container: HTMLElement, config: RenderAlertConfig): void {
  resetContainer(container);

  const alert = document.createElement('div');
  alert.setAttribute('role', 'alert');
  alert.style.cssText = `
    border-radius: var(--yc-border-radius-md);
    background: ${config.variant === 'warning' ? 'var(--yc-color-warning-bg)' : 'var(--yc-color-error-light)'};
    color: ${config.variant === 'warning' ? 'var(--yc-color-warning-amber-darker)' : 'var(--yc-color-error-red-text)'};
    padding: var(--yc-spacing-md);
    font-family: var(--yc-font-family-base);
  `;

  if (config.title) {
    const title = document.createElement('strong');
    title.textContent = config.title;
    alert.appendChild(title);
  }

  const message = document.createElement('div');
  message.textContent = config.message;
  alert.appendChild(message);

  if (config.dismissible) {
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'x';
    closeBtn.setAttribute('aria-label', 'Dismiss alert');
    closeBtn.style.cssText = 'float:right;border:none;background:transparent;color:inherit;cursor:pointer;';
    closeBtn.addEventListener('click', () => config.onDismiss?.());
    alert.insertBefore(closeBtn, alert.firstChild);
  }

  container.appendChild(alert);
}

export function renderInput(container: HTMLElement, config: RenderInputConfig): void {
  resetContainer(container);

  const input = document.createElement('input');
  input.value = config.value ?? '';
  input.placeholder = config.placeholder ?? '';
  input.setAttribute('aria-label', config.ariaLabel ?? config.label ?? config.placeholder ?? 'Input');
  if (config.className) input.className = config.className;
  input.style.cssText = `
    width: 100%;
    border: var(--yc-border-width-thin) solid var(--yc-color-button-border);
    border-radius: var(--yc-border-radius-md);
    font-family: var(--yc-font-family-base);
    ${sizeStyles(config.size ?? 'md')}
  `;
  input.addEventListener('input', () => config.onChange?.(input.value));
  input.addEventListener('focus', () => config.onFocus?.());
  input.addEventListener('blur', () => config.onBlur?.());
  input.addEventListener('keydown', event => config.onKeyDown?.(event));

  container.appendChild(input);
}

export function renderTooltipButton(container: HTMLElement, config: RenderTooltipButtonConfig): void {
  resetContainer(container);

  const button = document.createElement('button');
  button.type = 'button';
  button.title = config.tooltip;
  button.setAttribute('aria-label', config.ariaLabel ?? config.tooltip);
  button.innerHTML = config.icon;
  button.style.cssText = `
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--yc-width-toolbar-button);
    height: var(--yc-height-toolbar-button);
    border: none;
    background: ${config.isActive ? (config.activeColor ?? 'var(--yc-color-primary)') : 'transparent'};
    color: ${config.isActive ? 'white' : 'var(--yc-color-icon)'};
    cursor: pointer;
    border-radius: var(--yc-border-radius-lg);
    padding: 0;
  `;
  button.addEventListener('click', () => config.onClick?.());

  if (config.badge) {
    const badge = document.createElement('span');
    badge.textContent = config.badge;
    badge.style.cssText = `
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: var(--yc-height-badge);
      height: var(--yc-height-badge);
      border-radius: var(--yc-border-radius-full);
      background: var(--yc-color-warning);
      color: var(--yc-color-text-inverse);
      font-size: var(--yc-font-size-xs);
      line-height: var(--yc-height-badge);
    `;
    button.appendChild(badge);
  }

  container.appendChild(button);
}

export function renderCheckboxItem(container: HTMLElement, config: RenderCheckboxItemConfig): void {
  resetContainer(container);

  const label = document.createElement('label');
  label.style.cssText = 'display:flex;align-items:center;gap:var(--yc-spacing-xs);';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = config.checked;
  checkbox.addEventListener('change', () => config.onChange(checkbox.checked));

  const text = document.createElement('span');
  text.textContent = config.label;

  label.appendChild(checkbox);
  label.appendChild(text);
  container.appendChild(label);
}

export function renderToolbar(container: HTMLElement, buttons: ToolbarButtonConfig[]): void {
  resetContainer(container);
  buttons.forEach(buttonConfig => {
    const buttonContainer = document.createElement('span');
    renderTooltipButton(buttonContainer, {
      icon: buttonConfig.icon,
      tooltip: buttonConfig.tooltip,
      onClick: buttonConfig.onClick,
      isActive: buttonConfig.isActive,
      activeColor: buttonConfig.activeColor,
      ariaLabel: buttonConfig.tooltip,
      badge: buttonConfig.badge,
    });
    container.appendChild(buttonContainer);
  });
}
