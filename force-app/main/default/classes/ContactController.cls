public with sharing class ContactController{
    @AuraEnabled(cacheable = true)
    public static List<Contact> getContactListForDataTable(){
        List<Contact> conList = [SELECT Id, Name, Title, Phone, Email, Picture__c, Rank__c, AccountId, Account.Name
                                 FROM Contact
                                 WHERE AccountId != NULL
                                 WITH USER_MODE
                                 LIMIT 10];
        return conList;
    }

    @AuraEnabled(cacheable = true)
    public static List<Contact> getContactsBasedOnAccount(String accountId){
        List<Contact> contactsList = [SELECT Id, Name, FirstName, LastName, Title, Phone, Email, Picture__c, Rank__c, AccountId, Account.Name, LeadSource
                                      FROM Contact
                                      WHERE AccountId = :accountId
                                      WITH USER_MODE
                                      LIMIT 10];
        return contactsList;
    }

}