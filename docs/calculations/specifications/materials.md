# Materials

## Domain Model
- **Material**: Base entity (e.g., "Cement").
- **Product**: Implementation-specific variant (e.g., "Brand X, Grade Y").
- **Separation**: Material defines the logical entity; Product/Packaging defines the SKU.

# Packaging

## Domain Model
- Represents how a material is bought.
- Example: Cement bought in 50kg bags.
- **Principle**: Packaging is product-specific. A bag is not a universal unit.

# Rates

## Domain Model
- **Rate**: Price per unit for a material.
- **Context**: Rates are scoped by Location, Brand, Supplier, and Time.
- **Traceability**: Rates must include a `source` field.

# Cost Model

## Domain Model
- `Quantity * Rate = Amount`
- Currency must be explicit.
- Tax and transport are excluded from base cost and handled as secondary cost components in future phases.

# Wastage Model

## Domain Model
- Defined by `WastageRule`.
- Can be percentage-based or fixed allowance.
- **Principle**: Never assume global wastage; wastage must be material/category specific.
