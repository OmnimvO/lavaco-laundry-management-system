export type ShopSettings = {
  id: number;

  shopName: string;
  shopAddress: string | null;
  contactNumber: string | null;
  receiptFooter: string;

  completeServicePrice: number;
  washAndDryPrice: number;
  washOnlyPrice: number;
  dryOnlyPrice: number;
  dryAndFoldPrice: number;
  foldOnlyPrice: number;

  extraRinseFee: number;

  soapPrice: number;
  softenerPrice: number;

  pickupOnlyFee: number;
  deliveryOnlyFee: number;
  pickupAndDeliveryFee: number;

  maximumWeightPerLoad: number;

  createdAt: string;
  updatedAt: string;
};

export type UpdateShopSettingsData = {
  shopName: string;
  shopAddress: string | null;
  contactNumber: string | null;
  receiptFooter: string;

  completeServicePrice: number;
  washAndDryPrice: number;
  washOnlyPrice: number;
  dryOnlyPrice: number;
  dryAndFoldPrice: number;
  foldOnlyPrice: number;

  extraRinseFee: number;

  soapPrice: number;
  softenerPrice: number;

  pickupOnlyFee: number;
  deliveryOnlyFee: number;
  pickupAndDeliveryFee: number;

  maximumWeightPerLoad: number;
};