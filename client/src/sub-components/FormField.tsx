import React, { useState } from "react";
import Select, { MultiValue } from "react-select";

interface Option {
  value: string;
  label: string;
}

interface FormFieldProps {
  label: string;
  value: string | number | string[];
  type?: "text" | "date" | "number" | "select" | "multiselect";
  onChange: (newValue: any) => void;
  options?: Option[];
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  type = "text",
  onChange,
  options,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleEditClick = () => setIsEditing(true);
  const handleSave = () => {
    onChange(tempValue);
    setIsEditing(false);
  };
  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  const renderEditingField = () => {
    // For a select dropdown
    if (type === "select" && options) {
      return (
        <select
          className="form-control"
          value={tempValue as string}
          onChange={(e) => setTempValue(e.target.value)}
        >
          <option value="">Select</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    // For a multi-select using react-select
    if (type === "multiselect" && options) {
      return (
        <Select
          isMulti
          options={options}
          value={options.filter((option) =>
            (tempValue as string[]).includes(option.value)
          )}
          onChange={(selectedOptions: MultiValue<Option>) => {
            const values = selectedOptions.map((option) => option.value);
            setTempValue(values);
          }}
        />
      );
    }

    // For Date
    if (type === 'date'){
      return (
        <input
          type="date"
          className="form-control"
          value={tempValue ? new Date(tempValue as string).toISOString().split("T")[0] : ""}
          onChange={(e) => setTempValue(e.target.value)}
        />
      );
    };

    // For other input types
    return (
      <input
        type={type}
        className="form-control"
        value={tempValue as string | number}
        onChange={(e) => setTempValue(e.target.value)}
      />
    );
  };

  // Function to display the value when not editing:
  const displayValue = () => {
    if (type === "multiselect" && Array.isArray(value) && options) {
      return options
        .filter((option) => (value as string[]).includes(option.value))
        .map((option) => option.label)
        .join(", ");
    }
    if (type === "select" && options) {
      const selectedOption = options.find((option) => option.value === value);
      return selectedOption ? selectedOption.label : value;
    }
    if(type === "date" && value){
      const dateObj = new Date(value as string);
      return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      
    }
    return value;
  };

  return (
    <div className="d-flex align-items-center mb-3">
      <div style={{ width: "150px", fontWeight: "bold" }}>{label}:</div>
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
  );
};

export default FormField;