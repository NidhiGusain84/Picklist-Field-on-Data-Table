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
    public static List<ContactWrapper> getContactsBasedOnAccount(String accountId){
        List<Contact> contactsList = [SELECT Id, Name, FirstName, LastName, Title, Phone, Email, Picture__c, Rank__c, AccountId, Account.Name, LeadSource, (SELECT Id
                                                                                                                                                            FROM cases)
                                      FROM Contact 
                                      WHERE AccountId = :accountId
                                      WITH USER_MODE
                                      LIMIT 10];
        List<ContactWrapper> wrapperList = new List<ContactWrapper>();

        for (Contact con : contactsList){
            ContactWrapper wrapper = new ContactWrapper();
            wrapper.Id = con.Id;
            wrapper.FirstName = con.FirstName;
            wrapper.LastName = con.LastName;
            wrapper.Title = con.Title;
            wrapper.Phone = con.Phone;
            wrapper.Email = con.Email;
            wrapper.LeadSource = con.LeadSource;
            wrapper.numberOfCases = con.Cases.size();
            if (con.LeadSource == 'Phone Inquiry' && String.isBlank(con.Phone)){
                wrapper.isBadContact = true;
            } else{
                wrapper.isBadContact = false;
            }
            wrapperList.add(wrapper);
        }
        return wrapperList;
    }

    public class ContactWrapper{
        @AuraEnabled
        public String FirstName;
        @AuraEnabled
        public String LastName;
        @AuraEnabled
        public String Title;
        @AuraEnabled
        public String Phone;
        @AuraEnabled
        public String Email;
        @AuraEnabled
        public String LeadSource;
        @AuraEnabled
        public Integer numberOfCases;
        @AuraEnabled
        public Boolean isBadContact;
        @AuraEnabled
        public String Id;

    }

}