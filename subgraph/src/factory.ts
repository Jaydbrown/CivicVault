import { DAOCreated } from "../generated/CivicVaultFactory/CivicVaultFactory";
import { CivicVault as CivicVaultTemplate } from "../generated/templates";
import { DAO, DaoCreatedEvent } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleDAOCreated(event: DAOCreated): void {
  const dao = new DAO(event.params.daoAddress.toHexString());
  dao.name = event.params.name;
  dao.location = event.params.location;
  dao.creator = event.params.creator;
  dao.createdAt = event.params.timestamp;
  dao.isActive = true;
  dao.memberCount = BigInt.fromI32(0);
  dao.totalValueLocked = BigInt.fromI32(0);
  dao.investmentCount = BigInt.fromI32(0);
  dao.activeInvestmentCount = BigInt.fromI32(0);
  dao.save();

  CivicVaultTemplate.create(event.params.daoAddress);

  const ev = new DaoCreatedEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  ev.dao = dao.id;
  ev.timestamp = event.params.timestamp;
  ev.blockNumber = event.block.number;
  ev.save();
}
