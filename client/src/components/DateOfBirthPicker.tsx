import { DatePicker, type DatePickerProps } from "@/components/DatePicker";

export type DateOfBirthPickerProps = Omit<DatePickerProps, "title" | "testId"> & {
  title?: string;
};

export function DateOfBirthPicker({
  title = "Select Date of Birth",
  ...rest
}: DateOfBirthPickerProps) {
  return <DatePicker {...rest} title={title} testId="dob-picker" />;
}
