public with sharing class InfiniteLoadDataController{
    @AuraEnabled(cacheable = true)
    public static List<Account> loadDataById(){
        return [SELECT Id, Name, Industry, Rating
                FROM Account
                ORDER BY Name, Id
                LIMIT 500];
    }

    @AuraEnabled(cacheable = true)
    public static List<Account> loadMoreData(String lastName, String lastId){
        return [SELECT Id, Name, Industry, Rating
                FROM Account
                WHERE (Name > :lastName) OR (Name = :lastName AND Id > :lastId)
                ORDER BY Name, Id
                limit 500];
    }

    @AuraEnabled(cacheable = true)
    public static Integer countOfAccounts(){
        AggregateResult agResult = [SELECT count(Id)recordCount
                                    FROM Account];
        Integer count = (Integer) agResult.get('recordCount');
        return count;
    }

}