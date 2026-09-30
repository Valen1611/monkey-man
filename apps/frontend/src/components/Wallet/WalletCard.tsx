import { moneyFormat } from "@/src/utils/utils";

interface WalletCardProps {
    cardName: string;
    cardBalance: number;
    className?: string;
    color?: string;
    index?: number;
}

export default function WalletCard({ cardName, cardBalance, className, color, index = 0 }: WalletCardProps) {
    const defaultOffset = 40 + index * 25;
    const rotations = [-3, 2, -2, 3, -1, 1];
    const hoverYs = [-75, -50, -25, -10];
    const rot = rotations[index % rotations.length];
    const hoverY = hoverYs[index % hoverYs.length] || -30;

    return (
        <div 
            className={`card ${className || cardName.toLowerCase()}`}
            style={{
                backgroundColor: color || undefined,
                bottom: `${defaultOffset}px`,
                zIndex: 10 + index * 5,
                ['--card-hover-y' as string]: `${hoverY}px`,
                ['--card-rot' as string]: `${rot}deg`
            } as React.CSSProperties}
        >
            <div className="card-inner">
              <div className="card-top">
                <span>{cardName}</span>
                    <p>{moneyFormat(cardBalance)}</p>
              </div>
              <div className="card-bottom">
                <div className="card-info">
                  <span className="label">Holder</span><span className="value">ALEX SMITH</span>
                </div>
                <div className="card-number-wrapper">
                  <span className="hidden-stars">**** 4242</span>
                  <span className="card-number">5524 9910 4242</span>
                </div>
              </div>
            </div>
          </div>
    );
}
