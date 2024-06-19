// https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
// các code của game sẽ từ 1-99, tránh trùng với các code của hệ thống

export const RunMode = {
  Editor: 'editor',
  Development: 'development',
  Production: 'production',
}

export const Pharse = {
  Testnet: 'testnet',
  Mainnet: 'mainnet',
}

export const MineSlot = {
  WarpTime: 'WarpTime',
  Gem: 'Gem',
  Crystal: 'Crystal',
}

export const MineRateRarity = {
  Common: 'Common',
  Uncommon: 'Uncommon',
  Rare: 'Rare',
  Epic: 'Epic',
  Legendary: 'Legendary',
  Mythic: 'Mythic',
  Exotic: 'Exotic',
}

export const MineAction = {
  Open: 'Open',
  Refresh: 'Refresh',
}

export const QuestType = {
  Transaction: 1,
  UpgradeWeapon: 2,
  UpgradeArmor: 3,
  UpgradeRing: 4,
  UseBooster: 5,
  OpenMine: 6,
  InviteFriend: 7,
  Purchase: 8,
  VisitHomePage: 9,
  CompleteQuest: 10
}

export const MineStoneType = {
  ConnectX: 1,
  ConnectWallet: 2,
  TelePremium: 3,
  Tweet: 4,
  CumulativeInvitations: 5,
  ContinuousCheckIn: 6,
  CumulativePurchase: 7,
  JoinTeleCommunity: 8,
  JoinTeleAnnounce: 9,
  RatingApp: 10
}

export enum OpCode {
  Success = 0,
  Unknown = 1,
  Forbidden = 2,
  MultiDevice = 3,
  Unauthorized = 201,
  Expired = 202,
  InvalidToken = 203,
  BadRequest = 400,
  OutOfRange = 401,
  NotFound = 404, // api chưa available hiện tại
  InternalServerError = 500, // ko connect được đến server

  DownloadCsvFailed = 1,
  UrlParamIsRequired = 2,
  FailedToProxyRequest = 3,
  // Login or register
  UserNameOrPasswordNull = 10,
  UserNameOrPasswordInvalid = 11,
  UserNameExisted = 15,
  UserRemoveFailed = 13,
  InvalidWalletAddress = 16,

  // Upgrade
  NotEnough = 20,

  // Blessing
  InvalidUpdateTime = 31,
  NotFoundBuffId = 32,
  NotFoundCsvBuffId = 33,
  AutoBlessingActive = 34,

  // IAP
  InvalidPurchaseTime = 41,
  NotFoundPackId = 42,
  NotFoundCsvPackId = 43,
  NotFoundAutoBlessing = 44,
  NotFoundMemberShip = 45,
  AlreadyBought = 46,
  AlreadyClaimed = 47,
  InactiveMemberShip = 48,
  NotFoundBillId = 49,
  InvalidPrice = 50,
  NotVerifiedBill = 51,
  CanceledBill = 52,
  FailedBill = 53,
  InvalidBillState = 54,

  // Mine
  MaxSlotOpened = 51,

  // Quest
  QuestNotCompleted = 61,
}

export enum LoginMethod {
  Pasword = 0,
  TeleToken = 1,
  TeleTgData = 2,
  TeleBot = 3,
}
