import React, { useState, useEffect } from "react";
import Select, { MultiValue } from "react-select";

interface Option {
  value: string;
  label: string;
}

interface ValidationError {
  isValid: boolean;
  message: string;
}

interface FormFieldProps {
  label: string;
  value: any; // Changed to any to handle more complex types
  type?: "text" | "date" | "number" | "select" | "multiselect" | "email";
  onChange: (newValue: any) => void;
  options?: Option[];
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  parentField?: string; // To identify fields that depend on other fields
  resetDependentFields?: () => void; // Function to reset dependent fields
  returnRawValue?: boolean; // New prop to control if we return raw value (string) instead of object
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  type = "text",
  onChange,
  options,
  required = false,
  minLength,
  maxLength,
  min,
  max,
  //parentField,
  resetDependentFields,
  returnRawValue = false, // Default to false for backward compatibility
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState<any>(value);
  const [error, setError] = useState<ValidationError>({ isValid: true, message: "" });
  const [touched, setTouched] = useState(false);

  // Update tempValue when value changes (e.g., from parent component)
  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const validateField = (val: any): ValidationError => {
    // Handle validation for both raw values and object values
    const actualValue = typeof val === 'object' && val !== null && 'value' in val ? val.value : val;
    
    // Required field check
    if (required && (actualValue === undefined || actualValue === null || actualValue === "" || 
        (Array.isArray(actualValue) && actualValue.length === 0) || 
        (typeof actualValue === 'object' && Object.keys(actualValue).length === 0))) {
      return { isValid: false, message: "This field is required" };
    }

    switch (type) {
      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (actualValue && !emailRegex.test(actualValue)) {
          return { isValid: false, message: "Please enter a valid email address" };
        }
        break;
      case "text":
        if (minLength && actualValue && actualValue.length < minLength) {
          return { isValid: false, message: `Minimum ${minLength} characters required` };
        }
        if (maxLength && actualValue && actualValue.length > maxLength) {
          return { isValid: false, message: `Maximum ${maxLength} characters allowed` };
        }
        break;
      case "number":
        if (min !== undefined && actualValue !== "" && Number(actualValue) < min) {
          return { isValid: false, message: `Value must be at least ${min}` };
        }
        if (max !== undefined && actualValue !== "" && Number(actualValue) > max) {
          return { isValid: false, message: `Value must be at most ${max}` };
        }
        break;
      case "date":
        if (actualValue) {
          const dateVal = new Date(actualValue);
          if (isNaN(dateVal.getTime())) {
            return { isValid: false, message: "Please enter a valid date" };
          }
        }
        break;
    }

    return { isValid: true, message: "" };
  };

  const handleEditClick = () => setIsEditing(true);
  
  const handleSave = () => {
    setTouched(true);
    const validation = validateField(tempValue);
    setError(validation);
    
    if (validation.isValid) {
      // If returnRawValue is true and this is a select type, extract the raw value
      if (returnRawValue && type === "select" && typeof tempValue === 'object' && tempValue !== null && 'value' in tempValue) {
        onChange(tempValue.value);
      } else {
        onChange(tempValue);
      }
      
      setIsEditing(false);
      
      // If this is a parent field (like country or province), reset dependent fields
      if (resetDependentFields) {
        resetDependentFields();
      }
    }
  };
  
  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
    setTouched(false);
    setError({ isValid: true, message: "" });
  };
  
  const handleChange = (val: any) => {
    setTempValue(val);
    setTouched(true);
    setError(validateField(val));
    
    // If this field has dependents and we're editing directly (not saving yet)
    if (resetDependentFields && (type === "select" || type === "multiselect")) {
      // This will be handled when Save is clicked to avoid resetting fields before confirming changes
    }
  };

  const renderEditingField = () => {
    // For a select dropdown
    if (type === "select" && options) {
      return (
        <div>
          <select
            className={`form-control ${!error.isValid && touched ? "is-invalid" : ""}`}
            value={typeof tempValue === 'object' && tempValue !== null ? tempValue.value : tempValue}
            onChange={(e) => {
              const selectedValue = e.target.value;
              const selectedOption = options.find(opt => opt.value === selectedValue);
              // If returnRawValue is true, just store the string value
              if (returnRawValue) {
                handleChange(selectedValue);
              } else {
                handleChange(selectedOption ? { value: selectedOption.value, label: selectedOption.label } : selectedValue);
              }
            }}
          >
            <option value="">Select</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {!error.isValid && touched && <div className="invalid-feedback d-block">{error.message}</div>}
        </div>
      );
    }
    
    // For a multi-select using react-select
    if (type === "multiselect" && options) {
      return (
        <div>
          <Select
            isMulti
            options={options}
            value={
              Array.isArray(tempValue) 
                ? tempValue.map(val => {
                    if (typeof val === 'object' && val !== null) {
                      return val;
                    } else {
                      const option = options.find(opt => opt.value === val || opt.label === val);
                      return option || { value: val, label: val };
                    }
                  })
                : []
            }
            onChange={(selectedOptions: MultiValue<Option>) => {
              // For multiselect, we might want to keep the objects for display purposes
              // but extract raw values for API submission based on returnRawValue
              if (returnRawValue) {
                const rawValues = selectedOptions.map(option => option.value);
                handleChange(rawValues);
              } else {
                handleChange(selectedOptions);
              }
            }}
            className={!error.isValid && touched ? "is-invalid" : ""}
          />
          {!error.isValid && touched && <div className="invalid-feedback d-block">{error.message}</div>}
        </div>
      );
    }

    // For Date
    if (type === 'date') {
      return (
        <div>
          <input
            type="date"
            className={`form-control ${!error.isValid && touched ? "is-invalid" : ""}`}
            value={tempValue ? new Date(tempValue).toISOString().split("T")[0] : ""}
            onChange={(e) => handleChange(e.target.value)}
          />
          {!error.isValid && touched && <div className="invalid-feedback d-block">{error.message}</div>}
        </div>
      );
    }

    // For email
    if (type === 'email') {
      return (
        <div>
          <input
            type="email"
            className={`form-control ${!error.isValid && touched ? "is-invalid" : ""}`}
            value={tempValue || ""}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          {!error.isValid && touched && <div className="invalid-feedback d-block">{error.message}</div>}
        </div>
      );
    }

    // For number
    if (type === 'number') {
      return (
        <div>
          <input
            type="number"
            className={`form-control ${!error.isValid && touched ? "is-invalid" : ""}`}
            value={tempValue || ""}
            min={min}
            max={max}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          {!error.isValid && touched && <div className="invalid-feedback d-block">{error.message}</div>}
        </div>
      );
    }

    // For other input types
    return (
      <div>
        <input
          type={type}
          className={`form-control ${!error.isValid && touched ? "is-invalid" : ""}`}
          value={tempValue || ""}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setTouched(true)}
          minLength={minLength}
          maxLength={maxLength}
        />
        {!error.isValid && touched && <div className="invalid-feedback d-block">{error.message}</div>}
      </div>
    );
  };

  // Function to display the value when not editing
  const displayValue = () => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted">Not set</span>;
    }

    if (type === "date" && value) {
      try {
        const dateObj = new Date(value);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        }
      } catch (e) {
        console.error("Invalid date format:", value);
      }
      return value;
    }

    if (type === "select" && value) {
      if (typeof value === 'object' && value !== null && 'label' in value) {
        return value.label;
      }
      // If value is just a string, find the matching option
      if (options) {
        const option = options.find(opt => opt.value === value);
        return option ? option.label : value;
      }
      return value;
    }

    if (type === "multiselect" && Array.isArray(value)) {
      return value.map(item => {
        if (typeof item === 'object' && item !== null && 'label' in item) {
          return item.label;
        }
        if (options) {
          const option = options.find(opt => opt.value === item);
          return option ? option.label : item;
        }
        return item;
      }).join(", ");
    }

    return value;
  };

  return (
    <div className="form-group mb-3">
      <div className="d-flex align-items-center">
        <div style={{ width: "150px", fontWeight: "bold" }}>
          {label}
          {required && <span className="text-danger ms-1">*</span>}:
        </div>
        <div className="flex-grow-1">
          {isEditing ? renderEditingField() : <span>{displayValue()}</span>}
        </div>
        <div>
          {isEditing ? (
            <>
              <button
                type="button"
                className="btn btn-sm btn-primary ms-2"
                onClick={handleSave}
                disabled={!error.isValid}
              >
                Save
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary ms-2"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-link ms-2"
              onClick={handleEditClick}
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormField;