import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import CloseButton from "react-bootstrap/CloseButton";

const BootstrapChip = ({
  label,
  onPress,
  onClose,
  icon: Icon,
  selectedVariant = "danger",
  unselectedVariant = "outline-danger",
  defaultSelected = false,
  size = "sm",
}) => {
  const [isSelected, setIsSelected] = useState(defaultSelected);

  const handleClick = (e) => {
    if (onPress) onPress(e);
    setIsSelected((prev) => !prev);
  };

  return (
    <div className="d-inline-flex align-items-center m-1">
      <Button
        variant={isSelected ? selectedVariant : unselectedVariant}
        size={size}
        className="rounded-pill d-flex align-items-center"
        onClick={handleClick}
        style={{
          paddingRight: onClose ? "0.25rem" : undefined,
          cursor: onPress ? "pointer" : "default",
        }}
      >
        {Icon && <Icon className="me-1" size={16} />}
        <span>{label}</span>

        {onClose && (
          <span
            className="ms-1"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Remove"
            style={{ cursor: "pointer" }}
          >
            <CloseButton variant={isSelected ? "white" : undefined} />
          </span>
        )}
      </Button>
    </div>
  );
};

export default BootstrapChip;
