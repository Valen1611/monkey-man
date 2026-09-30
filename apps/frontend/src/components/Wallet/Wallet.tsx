"use client"
import React from 'react';
import styled from 'styled-components';
import WalletCard from './WalletCard';
import { moneyFormat } from '@/src/utils/utils';
import { useWallets } from '@/src/hooks/useWallets';

const Card = () => {
  const { data: wallets = [] } = useWallets({
    refetchInterval: 3000
  });

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  return (
    <StyledWrapper>
      <div className="app-container">
        <div className="wallet">
          <div className="wallet-back" />
          {wallets.map((wallet, index) => (
            <WalletCard 
              key={wallet.id} 
              cardName={wallet.name} 
              cardBalance={Math.floor(wallet.balance)} 
              color={wallet.color}
              index={index}
              className={wallet.name.toLowerCase()} 
            />
          ))}         
          <div className="pocket">
            <svg className="pocket-svg" viewBox="0 0 280 160" fill="none">
              <path d="M 0 20 C 0 10, 5 10, 10 10 C 20 10, 25 25, 40 25 L 240 25 C 255 25, 260 10, 270 10 C 275 10, 280 10, 280 20 L 280 120 C 280 155, 260 160, 240 160 L 40 160 C 20 160, 0 155, 0 120 Z" fill="#1e341e" />
              <path d="M 8 22 C 8 16, 12 16, 15 16 C 23 16, 27 29, 40 29 L 240 29 C 253 29, 257 16, 265 16 C 268 16, 272 16, 272 22 L 272 120 C 272 150, 255 152, 240 152 L 40 152 C 25 152, 8 152, 8 120 Z" stroke="#3d5635" strokeWidth="1.5" strokeDasharray="6 4" />
            </svg>
            <div className="pocket-content">
              <div style={{position: 'relative', height: 50, width: '100%'}}>
                <div className="balance-real">{moneyFormat(totalBalance)}</div>
              </div>
              <div style={{color: '#698263', fontSize: 12, fontWeight: 500}}>
                Total Balance
              </div>            
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  /* Note: this design contains two hover states 1. card hover this just shift card above 2.card hover to see full card. OK! */

  /* Wallet Wrapper */
  .wallet {
    position: relative;
    width: 280px;
    height: 230px;
    cursor: pointer;
    perspective: 1000px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    transition: transform 0.4s ease;
  }
  /* entry animation for card as page loads */
  @keyframes slideIntoPocket {
    0% {
      transform: translateY(-100px);
      opacity: 0;
    }

    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* this is wallet back */
  .wallet-back {
    position: absolute;
    bottom: 0;
    width: 280px;
    height: 200px;
    background: #1e341e;
    border-radius: 22px 22px 60px 60px;
    z-index: 5;
    box-shadow:
      inset 0 25px 35px rgba(0, 0, 0, 0.4),
      inset 0 5px 15px rgba(0, 0, 0, 0.5);
  }

  /* Cards things */
  .card {
    position: absolute;
    width: 260px;
    height: 140px;
    left: 10px;
    border-radius: 16px;
    padding: 18px;
    color: white;
    box-shadow:
      inset 0 1px 1px rgba(255, 255, 255, 0.3),
      0 -4px 15px rgba(0, 0, 0, 0.1);
    transition:
      transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
      z-index 0s;
    animation: slideIntoPocket 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  }

  .card-inner {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .chip {
    width: 32px;
    height: 24px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .label {
    font-size: 8px;
    opacity: 0.7;
    text-transform: uppercase;
    margin-bottom: 2px;
    display: block;
  }

  .value {
    font-size: 10px;
    font-weight: 500;
  }

  .card-number-wrapper {
    text-align: right;
  }

  .hidden-stars {
    font-size: 16px;
    letter-spacing: 2px;
  }

  .card-number {
    display: none;
    font-size: 14px;
    letter-spacing: 1px;
    font-family: monospace;
  }

  /* card variants */
  .mercadopago {
    background: #8df7ff;
    bottom: 90px;
    z-index: 10;
    animation-delay: 0.1s;
  }

  .santander {
    background: #fd6969;
    bottom: 65px;
    z-index: 20;
    animation-delay: 0.2s;
  }

  .paypal {
    background: #ffffff;
    color: #003087;
    bottom: 40px;
    z-index: 30;
    animation-delay: 0.3s;
  }

  .paypal .chip {
    background: rgba(0, 0, 0, 0.05);
  }

  .paypal .label {
    color: #8c979d;
  }

  /* Pocket */
  .pocket {
    position: absolute;
    bottom: 0;
    width: 280px;
    height: 160px;
    z-index: 40;
    filter: drop-shadow(0 15px 25px rgba(20, 40, 20, 0.4));
  }

  .pocket-content {
    position: absolute;
    top: 45px;
    width: 100%;
    text-align: center;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .balance-real {
    color: #a7c59e;
    font-size: 30px;
    font-weight: 600;
    opacity: 1;
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, 10px);
    transition: 0.3s;
  }


  /* hovers works here */
  .wallet:hover {
    transform: translateY(-5px);
  }

  /* hover effects on dynamic cards */
  .wallet:hover .card {
    transform: translateY(var(--card-hover-y, -30px)) rotate(var(--card-rot, 0deg));
  }

  /* specific overrides if needed */
  .wallet:hover .mercadopago {
    transform: translateY(-75px) rotate(-3deg);
  }

  .wallet:hover .santander {
    transform: translateY(-45px) rotate(2deg);
  }

  .wallet:hover .paypal {
    transform: translateY(-10px);
  }

  /* indi card hover */
  .card:hover {
    z-index: 100 !important;
    transition-delay: 0s !important;
  }

  .wallet:hover .stripe:hover {
    transform: translateY(-60px) scale(1.05) rotate(0);
  }

  .wallet:hover .wise:hover {
    transform: translateY(-70px) scale(1.05) rotate(0);
  }

  .wallet:hover .paypal:hover {
    transform: translateY(-60px) scale(1.05) rotate(0);
  }

  .card:hover .hidden-stars {
    display: none;
  }

  .card:hover .card-number {
    display: block;
  }

  .wallet:hover .balance-real {
    opacity: 1;
    transform: translate(-50%, 0);
  }`;

export default Card;
