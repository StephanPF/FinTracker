# Currency Symbol Implementation

## Working Pattern from Budget Form

The Budget form correctly implements currency symbols using a specific CSS positioning pattern that we successfully applied to the Add Transaction form.

### HTML Structure

```jsx
<div className="amount-input-container">
  <input
    style={{
      paddingRight: '30px'
    }}
    // ... other props
  />
  <span className="currency-symbol-right">{baseCurrency?.symbol || ''}</span>
</div>
```

### CSS Implementation

```css
.amount-input-container {
  position: relative;
  display: inline-block;
}

.amount-input-container input {
  width: 100%;
  padding: 0.75rem;
  padding-right: 30px; /* Make space for currency symbol */
}

.currency-symbol-right {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
  font-weight: 500;
}
```

## Key Implementation Points

1. **Container Setup**: Use `position: relative` on the container to establish positioning context
2. **Input Padding**: Add `padding-right: 30px` to the input to create space for the symbol
3. **Absolute Positioning**: Position the currency symbol absolutely within the container
4. **Vertical Centering**: Use `top: 50%` and `transform: translateY(-50%)` for perfect vertical alignment
5. **Non-Interactive**: Use `pointer-events: none` so the symbol doesn't interfere with input focus

## Applied to Add Transaction Form

This pattern was successfully implemented in the Add Transaction form for both the main amount field and the destination amount field (for investment transactions), ensuring consistent currency symbol display across the application.