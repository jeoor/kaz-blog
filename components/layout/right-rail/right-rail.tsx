import type { ReactNode } from "react";

export type RailWidget = {
    key: string;
    node: ReactNode;
};

type Props = {
    widgets: RailWidget[];
    className?: string;
};

export default function RightRail({ widgets, className = "" }: Props) {
    return (
        <div className={["space-y-4 pr-2", className].filter(Boolean).join(" ")}>
            {widgets.map((widget) => (
                <div key={widget.key}>{widget.node}</div>
            ))}
        </div>
    );
}
