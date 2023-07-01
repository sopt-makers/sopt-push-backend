import { AttributeValue, QueryCommandOutput } from '@aws-sdk/client-dynamodb';
import { isNil } from 'lodash';
import { DeviceTokenEntity, UserTokenEntity } from '../types/tokens';
import tokenFactory from '../modules/tokenFactory';
import { Platform } from '../types';

function isTokenUserEntity(queryCommandOutputItems: Record<string, AttributeValue>): queryCommandOutputItems is Record<
  string,
  AttributeValue
> & {
  pk: AttributeValue.SMember;
  sk: AttributeValue.SMember;
  platform: AttributeValue.SMember;
  endpointArn: AttributeValue.SMember;
  createdAt: AttributeValue.SMember;
  subscriptionArn: AttributeValue.SMember;
} {
  if (
    isNil(queryCommandOutputItems.pk.S) ||
    isNil(queryCommandOutputItems.sk.S) ||
    isNil(queryCommandOutputItems.platform.S) ||
    isNil(queryCommandOutputItems.endpointArn.S) ||
    isNil(queryCommandOutputItems.createdAt.S) ||
    isNil(queryCommandOutputItems.subscriptionArn.S)
  ) {
    return false;
  }

  if (queryCommandOutputItems.pk.S.split('#').length !== 2) {
    return false;
  }
  if (queryCommandOutputItems.sk.S.split('#').length !== 2) {
    return false;
  }
  return true;
}

const getTokenByUserId = async (userId: string): Promise<UserTokenEntity | null> => {
  const queryCommandOutput = await tokenFactory.queryTokenByUserId(userId);

  if (isNil(queryCommandOutput.Items)) {
    throw new Error('queryCommandOutput.Items is undefined');
  }

  if (queryCommandOutput.Items.length === 0) {
    return null;
  }
  const queryCommandOutputItems: Record<string, AttributeValue> = queryCommandOutput.Items[0];

  if (!isTokenUserEntity(queryCommandOutputItems)) {
    throw new Error('queryCommandOutputItems is not UserTokenEntity');
  }

  const tokenEntity: UserTokenEntity = {
    userId: queryCommandOutputItems.pk.S.split('#')[1],
    deviceToken: queryCommandOutputItems.sk.S.split('#')[1],
    entity: 'user',
    platform: queryCommandOutputItems.platform.S as Platform,
    endpointArn: queryCommandOutputItems.endpointArn.S,
    createdAt: queryCommandOutputItems.createdAt.S,
    subscriptionArn: queryCommandOutputItems.subscriptionArn.S,
  } as UserTokenEntity;

  return tokenEntity;
};

const getUserByTokenId = async (deviceToken: string): Promise<DeviceTokenEntity | null> => {
  const queryCommandOutput: QueryCommandOutput = await tokenFactory.queryTokenByDeviceToken(deviceToken);
  if (isNil(queryCommandOutput.Items)) {
    throw new Error('queryCommandOutput.Items is undefined');
  }

  if (queryCommandOutput.Items.length === 0) {
    return null;
  }
  const queryCommandOutputItems: Record<string, AttributeValue> = queryCommandOutput.Items[0];

  if (!isTokenUserEntity(queryCommandOutputItems)) {
    throw new Error('queryCommandOutputItems is not DeviceTokenEntity');
  }

  const tokenEntity: DeviceTokenEntity = {
    deviceToken: queryCommandOutputItems.pk.S.split('#')[1],
    userId: queryCommandOutputItems.sk.S.split('#')[1],
    entity: 'deviceToken',
    platform: queryCommandOutputItems.platform.S as Platform,
    endpointArn: queryCommandOutputItems.endpointArn.S,
    createdAt: queryCommandOutputItems.createdAt.S,
    subscriptionArn: queryCommandOutputItems.subscriptionArn.S,
  } as DeviceTokenEntity;

  return tokenEntity;
};

const findTokenByUserIds = async (userIds: string[]): Promise<UserTokenEntity[]> => {
  const result = await Promise.all(userIds.map(async (userId) => getTokenByUserId(userId)));
  return result.filter((user: UserTokenEntity | null): user is UserTokenEntity => user !== null);
};

const findUserByTokenIds = async (deviceTokens: string[]): Promise<DeviceTokenEntity[]> => {
  const result = await Promise.all(deviceTokens.map(async (deviceToken) => getUserByTokenId(deviceToken)));
  return result.filter((user: DeviceTokenEntity | null): user is DeviceTokenEntity => user !== null);
};

const deleteUser = async (deviceToken: string, userId: string): Promise<void> => {
  await tokenFactory.deleteToken(deviceToken, userId);
};

export { getTokenByUserId, findTokenByUserIds, findUserByTokenIds, deleteUser };
