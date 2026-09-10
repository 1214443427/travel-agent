import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test } from "vitest";
import TextBox from "@/app/components/TextBox";

describe("TextBox", () => {
  test("renders children", () => {
    const TestComponent = <p>test</p>;
    render(<TextBox>{TestComponent}</TextBox>);
    expect(screen.getByText("test")).toBeInTheDocument();
  });

  test("classname are combined correctly. ", () => {
    render(<TextBox className="rounded-[40px]">test</TextBox>);
    const textbox = screen.getByTestId("textbox-wrapper");
    expect(textbox.classList).toContain("rounded-[40px]");
    const classlistString = textbox.classList.toString();
    expect(classlistString.indexOf("rounded-[40px]") > classlistString.indexOf("rounded-[20px]"));
  });
});
