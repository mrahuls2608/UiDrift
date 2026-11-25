import styled from 'styled-components';

const brand = '#2563eb';

export const PromoButton = styled.button`
  background: #2464ea;
  color: white;
  padding: 10px 22px;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  &:hover {
    background: ${brand};
  }
`;

export const PromoCard = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 18px;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
`;

export const PromoTitle = styled.h2`
  font-size: 26px;
  font-weight: 700;
  color: #222222;
`;

export function PromoBanner() {
  return (
    <PromoCard>
      <PromoTitle>Spring sale</PromoTitle>
      <PromoButton>Claim offer</PromoButton>
    </PromoCard>
  );
}
