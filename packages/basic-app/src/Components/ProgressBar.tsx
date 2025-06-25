import FlexBox from "./FlexBox";
import TagButton from "./TagButton";

interface ProgressBarProps
{
    currentValue: number;
    maximumValue: number;
    width: number | string;
    percentageDigits?: number;
    valueDigits?: number;
    valueSeparator?: string;
    currentValueSuffix?: string;
    maximumValueSuffix?: string;
}

export default function ProgressBar(props: ProgressBarProps)
{
    const {
        currentValue,
        maximumValue,
        width,
        percentageDigits = 1,
        valueDigits = 1,
        valueSeparator = "/",
        currentValueSuffix = "",
        maximumValueSuffix = "",
    } = props;

    const percentage = maximumValue > 0 ? (currentValue / maximumValue) * 100 : 0;

    const labelLeft = percentage.toFixed(percentageDigits ?? 1) + "%";
    const labelRight = currentValue.toFixed(valueDigits ?? 1) + currentValueSuffix + valueSeparator + maximumValue.toFixed(valueDigits ?? 1) + maximumValueSuffix;

    const label = <FlexBox width={width}><FlexBox width="50%">&nbsp;{labelLeft}</FlexBox><FlexBox width="50%" justifyContent="end">{labelRight}&nbsp;</FlexBox></FlexBox>;

    return (
        <FlexBox width={width} justifyContent="start" position="relative">
            <TagButton
                position="absolute"
                label={label}
                fullWidth
                align="left"
                textOverflow="clip"
                disablePadding
            />
            {percentage > 0 &&
                <TagButton
                    position="absolute"
                    label={label}
                    color="primary"
                    width={`calc(${width} * ${percentage / 100})`}
                    align="left"
                    textOverflow="clip"
                    disablePadding
                />
            }
        </FlexBox>
    );
}