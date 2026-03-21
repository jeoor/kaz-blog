import type { SVGProps } from "react";

export type UpArrowIconProps = SVGProps<SVGSVGElement> & {
    size?: number;
};

export function UpArrowIcon({ size, width, height, ...props }: UpArrowIconProps) {
    const w = size ?? width ?? 24;
    const h = size ?? height ?? 24;

    return (
        <svg
            width={w}
            height={h}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d="M12 2L19.39 9.39L22 12L20.61 13.39L12 4.79L3.39 13.39L2 12L4.61 9.39L12 2Z" />
        </svg>
    );
}
